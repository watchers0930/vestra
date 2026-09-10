/**
 * lib/pii-crypto-tree.ts 테스트
 * PII 트리 재귀 암/복호화 — 최상위 스칼라 + nested create(write) + nested include(read).
 * 실제 코드의 쿼리 형태(e-contracts / keepzip / sign 라우트)를 그대로 모사해 검증한다.
 */
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-key-for-vitest-32chars!!";
  process.env.PII_SALT = "test-pii-salt-for-vitest";
  process.env.PII_ENCRYPTION_KEY = "test-pii-encryption-key-for-vitest-32b!!"; // v2 전용(S8: v1 폐기)
});

import { encryptPII, decryptPII } from "@/lib/crypto";
import {
  encryptWriteTree,
  decryptReadTree,
  PII_FIELDS,
  MODEL_RELATIONS,
} from "@/lib/pii-crypto-tree";

// 값이 "암호화된 상태"인지(원문과 다르고 복호화하면 원문) 확인하는 헬퍼
function isEncrypted(value: unknown, plain: string): boolean {
  return typeof value === "string" && value !== plain && decryptPII(value) === plain;
}

describe("설정 무결성", () => {
  it("EContractSignature가 PII_FIELDS에 등록됨", () => {
    expect(PII_FIELDS.EContractSignature).toEqual([
      "signerName",
      "signerPhone",
      "signerEmail",
      "signerRrnPrefix",
    ]);
  });

  it("MODEL_RELATIONS 양방향 매핑", () => {
    expect(MODEL_RELATIONS.EContract).toEqual({ signatures: "EContractSignature" });
    expect(MODEL_RELATIONS.EContractSignature).toEqual({ contract: "EContract" });
  });
});

describe("encryptWriteTree — 최상위 스칼라", () => {
  it("KeepzipCase 최상위 PII 필드 암호화", () => {
    const data = { userId: "u1", senderName: "홍길동", recipientName: "김임대", address: "서울시 강남구", deposit: BigInt(100) };
    encryptWriteTree(data, "KeepzipCase");
    expect(isEncrypted(data.senderName, "홍길동")).toBe(true);
    expect(isEncrypted(data.recipientName, "김임대")).toBe(true);
    expect(isEncrypted(data.address, "서울시 강남구")).toBe(true);
    expect(data.userId).toBe("u1"); // 비PII 필드 불변
    expect(data.deposit).toBe(BigInt(100));
  });

  it("null/undefined/빈문자열 필드는 건너뜀", () => {
    const data = { signerName: "박서명", signerPhone: null, signerEmail: undefined, signerRrnPrefix: "" };
    encryptWriteTree(data, "EContractSignature");
    expect(isEncrypted(data.signerName, "박서명")).toBe(true);
    expect(data.signerPhone).toBeNull();
    expect(data.signerEmail).toBeUndefined();
    expect(data.signerRrnPrefix).toBe("");
  });

  it("이미 v2 암호문인 값은 재암호화하지 않음 (이중암호화 방지)", () => {
    const enc = encryptPII("임대인홍");
    const data = { senderName: enc, recipientName: "김임차", address: "강남" };
    encryptWriteTree(data, "KeepzipCase");
    expect(data.senderName).toBe(enc); // 이미 v2라 그대로 (재암호화 X)
    expect(decryptPII(data.senderName)).toBe("임대인홍"); // 한 번만 복호화하면 원본
    expect(isEncrypted(data.recipientName, "김임차")).toBe(true); // 평문은 정상 암호화
  });

  it("비PII·미등록 모델은 무변경", () => {
    const data = { title: "공지", content: "본문" };
    const snapshot = JSON.stringify(data);
    encryptWriteTree(data, "Announcement");
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});

describe("encryptWriteTree — nested create (e-contracts/route.ts 형태)", () => {
  it("EContract.create의 signatures.create 배열을 재귀 암호화", () => {
    // app/api/e-contracts/route.ts:143 형태
    const data = {
      contractType: "JEONSE",
      address: "서울시 서초구",
      landlordId: "L1",
      signatures: {
        create: [
          { role: "LANDLORD", signerName: "임대인", signerPhone: "010-1111-2222", signerRrnPrefix: "800101-1" },
          { role: "TENANT", signerName: "임차인", signerPhone: null, signerEmail: "t@example.com" },
        ],
      },
    };
    encryptWriteTree(data, "EContract");

    // EContract 자체엔 PII 스칼라 없음 → 최상위 필드 불변
    expect(data.address).toBe("서울시 서초구");

    const sigs = data.signatures.create;
    expect(isEncrypted(sigs[0].signerName, "임대인")).toBe(true);
    expect(isEncrypted(sigs[0].signerPhone, "010-1111-2222")).toBe(true);
    expect(isEncrypted(sigs[0].signerRrnPrefix, "800101-1")).toBe(true);
    expect(isEncrypted(sigs[1].signerName, "임차인")).toBe(true);
    expect(sigs[1].signerPhone).toBeNull();
    expect(isEncrypted(sigs[1].signerEmail, "t@example.com")).toBe(true);
    expect(sigs[0].role).toBe("LANDLORD"); // 비PII 불변
  });

  it("signatures.create가 단일 객체(배열 아님)여도 처리", () => {
    const data = { signatures: { create: { role: "TENANT", signerName: "단독서명" } } };
    encryptWriteTree(data, "EContract");
    expect(isEncrypted((data.signatures.create as { signerName: string }).signerName, "단독서명")).toBe(true);
  });
});

describe("encryptWriteTree — 기타 nested write 형태", () => {
  it("nested update { where, data } 의 data를 암호화", () => {
    const data = { signatures: { update: { where: { id: "s1" }, data: { signerName: "수정자" } } } };
    encryptWriteTree(data, "EContract");
    expect(isEncrypted((data.signatures.update.data as { signerName: string }).signerName, "수정자")).toBe(true);
  });

  it("nested upsert의 create/update 모두 암호화", () => {
    const data = {
      signatures: {
        upsert: { where: { id: "s1" }, create: { signerName: "생성자" }, update: { signerName: "갱신자" } },
      },
    };
    encryptWriteTree(data, "EContract");
    expect(isEncrypted((data.signatures.upsert.create as { signerName: string }).signerName, "생성자")).toBe(true);
    expect(isEncrypted((data.signatures.upsert.update as { signerName: string }).signerName, "갱신자")).toBe(true);
  });

  it("nested createMany.data 배열 암호화", () => {
    const data = { signatures: { createMany: { data: [{ signerName: "일괄1" }, { signerName: "일괄2" }] } } };
    encryptWriteTree(data, "EContract");
    const rows = data.signatures.createMany.data;
    expect(isEncrypted(rows[0].signerName, "일괄1")).toBe(true);
    expect(isEncrypted(rows[1].signerName, "일괄2")).toBe(true);
  });
});

describe("decryptReadTree — nested include", () => {
  it("EContract + signatures include (pdf/route.ts 형태) 복호화", () => {
    // 저장된 상태(암호화)를 모사
    const result = {
      id: "c1",
      address: "서초구", // EContract.address는 PII_FIELDS에 없음 → 그대로
      signatures: [
        { role: "LANDLORD", signerName: encryptPII("임대인"), signerPhone: encryptPII("010-9999-8888"), signerRrnPrefix: encryptPII("800101-1"), signatureUrl: "data:..." },
        { role: "TENANT", signerName: encryptPII("임차인"), signerPhone: null },
      ],
    };
    decryptReadTree(result, "EContract", 0);
    expect(result.signatures[0].signerName).toBe("임대인");
    expect(result.signatures[0].signerPhone).toBe("010-9999-8888");
    expect(result.signatures[0].signerRrnPrefix).toBe("800101-1");
    expect(result.signatures[1].signerName).toBe("임차인");
    expect(result.signatures[1].signerPhone).toBeNull();
    expect(result.signatures[0].signatureUrl).toBe("data:...");
  });

  it("select로 signerName만 뽑아도 그 필드만 복호화 (keepzip/my-contracts 형태)", () => {
    const result = [
      { id: "c1", address: "강남", signatures: [{ signerName: encryptPII("임대인A") }] },
      { id: "c2", address: "송파", signatures: [{ signerName: encryptPII("임대인B") }] },
    ];
    for (const c of result) decryptReadTree(c, "EContract", 0);
    expect(result[0].signatures[0].signerName).toBe("임대인A");
    expect(result[1].signatures[0].signerName).toBe("임대인B");
  });

  it("EContractSignature → contract → signatures 깊은 include (sign/complete 형태) 복호화", () => {
    // prisma.eContractSignature.findUnique({ include: { contract: { include: { signatures: true } } } })
    const sig = {
      id: "s1",
      signerName: encryptPII("본인"),
      signerPhone: encryptPII("010-0000-0000"),
      contract: {
        id: "c1",
        signatures: [
          { role: "LANDLORD", signerName: encryptPII("임대인") },
          { role: "TENANT", signerName: encryptPII("임차인") },
        ],
      },
    };
    decryptReadTree(sig, "EContractSignature", 0);
    expect(sig.signerName).toBe("본인");
    expect(sig.signerPhone).toBe("010-0000-0000");
    expect(sig.contract.signatures[0].signerName).toBe("임대인");
    expect(sig.contract.signatures[1].signerName).toBe("임차인");
  });

  it("평문(미암호화) 값은 그대로 (하위호환)", () => {
    const result = { signatures: [{ signerName: "아직평문" }] };
    decryptReadTree(result, "EContract", 0);
    expect(result.signatures[0].signerName).toBe("아직평문");
  });

  it("null 결과·비객체는 안전하게 무시", () => {
    expect(() => decryptReadTree(null, "EContract", 0)).not.toThrow();
    expect(() => decryptReadTree(undefined, "EContract", 0)).not.toThrow();
    expect(() => decryptReadTree(42, "EContract", 0)).not.toThrow();
  });
});

describe("write → read 라운드트립", () => {
  it("nested create 암호화 후 include 복호화하면 원본 복원", () => {
    const write = {
      contractType: "JEONSE",
      signatures: {
        create: [
          { role: "LANDLORD", signerName: "임대인", signerPhone: "010-1234-5678", signerEmail: "l@ex.com", signerRrnPrefix: "751201-2" },
          { role: "TENANT", signerName: "임차인", signerPhone: "010-8765-4321", signerEmail: "t@ex.com", signerRrnPrefix: "900505-1" },
        ],
      },
    };
    encryptWriteTree(write, "EContract");

    // DB 저장 후 include로 읽었다고 가정 (배열 형태로 복원)
    const read = {
      signatures: write.signatures.create.map((s) => ({ ...s })),
    };
    decryptReadTree(read, "EContract", 0);

    expect(read.signatures[0]).toMatchObject({
      role: "LANDLORD", signerName: "임대인", signerPhone: "010-1234-5678", signerEmail: "l@ex.com", signerRrnPrefix: "751201-2",
    });
    expect(read.signatures[1]).toMatchObject({
      role: "TENANT", signerName: "임차인", signerPhone: "010-8765-4321", signerEmail: "t@ex.com", signerRrnPrefix: "900505-1",
    });
  });

  it("KeepzipCase.recipientName ← signature.signerName 교차의존 라운드트립 (keepzip/cases 형태)", () => {
    // 1) EContract에 서명자 저장
    const owned = { signatures: { create: [{ role: "LANDLORD", signerName: "임대인홍" }] } };
    encryptWriteTree(owned, "EContract");
    // 2) include로 읽어 recipientName 결정
    const read = { signatures: owned.signatures.create.map((s) => ({ ...s })) };
    decryptReadTree(read, "EContract", 0);
    const recipientName = read.signatures[0].signerName; // "임대인홍"
    expect(recipientName).toBe("임대인홍");
    // 3) KeepzipCase.create에 recipientName으로 저장 → 재암호화
    const caseData = { recipientName, senderName: "임차인", address: "강남" };
    encryptWriteTree(caseData, "KeepzipCase");
    expect(isEncrypted(caseData.recipientName, "임대인홍")).toBe(true);
  });
});
