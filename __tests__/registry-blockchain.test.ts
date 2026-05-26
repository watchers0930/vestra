/**
 * lib/registry-blockchain.ts 테스트
 * 등기부 블록체인 암호화 — 섹션 분리, 스냅샷 생성, 변동 감지, 체인 검증
 */
import { describe, it, expect, beforeAll } from "vitest";

// 테스트용 환경변수 설정 (Ed25519 서명 + PII 암호화에 필요)
beforeAll(() => {
  process.env.REGISTRY_SIGNING_SEED = "test-seed-for-signing-2024";
  process.env.PII_SALT = "test-salt-for-pii-encryption";
  process.env.AUTH_SECRET = "test-secret-key-for-vitest-32chars!!";
});

import {
  splitRegistryIntoSections,
  createSnapshot,
  detectSectionChanges,
  verifySnapshotChain,
  decryptSnapshotData,
} from "@/lib/registry-blockchain";

describe("splitRegistryIntoSections", () => {
  it("정상 텍스트에서 섹션을 올바르게 분리한다", () => {
    const text = `【 표 제 부 】\n소재지: 서울시\n【 갑 구 】\n1. 소유권이전\n【 을 구 】\n1. 근저당권설정`;

    const result = splitRegistryIntoSections(text);

    expect(result.title).toContain("표 제 부");
    expect(result.gapgu).toContain("소유권이전");
    expect(result.eulgu).toContain("근저당권설정");
  });

  it("빈 텍스트는 모든 섹션이 빈 문자열", () => {
    const result = splitRegistryIntoSections("");

    expect(result.title).toBe("");
    expect(result.exclusive).toBe("");
    expect(result.gapgu).toBe("");
    expect(result.eulgu).toBe("");
  });
});

describe("createSnapshot", () => {
  it("스냅샷 생성 시 필수 필드가 모두 존재한다", async () => {
    const snap = await createSnapshot({
      monitoredPropertyId: "prop-123",
      fullText: "【 표 제 부 】\n서울시 강남구\n【 갑 구 】\n소유권이전",
      sequenceNo: 1,
      previousSnapshotHash: null,
    });

    expect(typeof snap.merkleRoot).toBe("string");
    expect(snap.merkleRoot.length).toBeGreaterThan(0);

    expect(typeof snap.snapshotHash).toBe("string");
    expect(snap.snapshotHash.length).toBeGreaterThan(0);

    expect(typeof snap.signature).toBe("string");
    expect(snap.signature.length).toBeGreaterThan(0);

    expect(snap.sectionHashes).toHaveLength(4);
  });
});

describe("detectSectionChanges", () => {
  it("변경된 섹션과 변경되지 않은 섹션을 정확히 감지한다", () => {
    const oldHashes = [
      { section: "title", hash: "abc" },
      { section: "gapgu", hash: "def" },
    ];
    const newHashes = [
      { section: "title", hash: "abc" },
      { section: "gapgu", hash: "xyz" },
    ];

    const changes = detectSectionChanges(oldHashes, newHashes);

    const titleChange = changes.find((c) => c.section === "title");
    const gapguChange = changes.find((c) => c.section === "gapgu");

    expect(titleChange?.changed).toBe(false);
    expect(gapguChange?.changed).toBe(true);
  });
});

describe("verifySnapshotChain", () => {
  it("빈 배열이면 isValid true", async () => {
    const result = await verifySnapshotChain([]);

    expect(result.isValid).toBe(true);
    expect(result.totalSnapshots).toBe(0);
  });
});

describe("암호화 가역성", () => {
  it("createSnapshot 후 decryptSnapshotData로 원본 텍스트를 복원한다", async () => {
    const originalText =
      "【 표 제 부 】\n서울시 강남구\n【 갑 구 】\n소유권이전";

    const snap = await createSnapshot({
      monitoredPropertyId: "prop-456",
      fullText: originalText,
      sequenceNo: 1,
      previousSnapshotHash: null,
    });

    const decrypted = decryptSnapshotData(snap.encryptedData);
    expect(decrypted).toBe(originalText);
  });
});
