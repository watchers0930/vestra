/**
 * lib/crypto.ts 테스트
 * PII 암호화/복호화, 해시, 마스킹 검증
 */
import { describe, it, expect, beforeAll } from "vitest";

// 테스트용 환경변수 설정
beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-key-for-vitest-32chars!!";
  process.env.PII_SALT = "test-pii-salt-for-vitest";
  process.env.PII_ENCRYPTION_KEY = "test-pii-encryption-key-for-vitest-32b!!"; // v2 전용 키(S8: v1 폐기)
});

import {
  encryptPII,
  decryptPII,
  hashForSearch,
  maskBusinessNumber,
  maskEmail,
} from "@/lib/crypto";

describe("encryptPII / decryptPII", () => {
  it("평문을 암호화하고 복호화하면 원본과 동일", () => {
    const plain = "서울시 강남구 역삼동 123-45";
    const encrypted = encryptPII(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted.length).toBeGreaterThan(0);
    expect(decryptPII(encrypted)).toBe(plain);
  });

  it("빈 문자열은 그대로 반환", () => {
    expect(encryptPII("")).toBe("");
    expect(decryptPII("")).toBe("");
  });

  it("동일 평문도 매번 다른 암호문 생성 (IV 랜덤)", () => {
    const plain = "1234567890";
    const enc1 = encryptPII(plain);
    const enc2 = encryptPII(plain);
    expect(enc1).not.toBe(enc2);
    // 둘 다 복호화 가능
    expect(decryptPII(enc1)).toBe(plain);
    expect(decryptPII(enc2)).toBe(plain);
  });

  it("잘못된 암호문은 원본 반환 (하위 호환)", () => {
    const invalid = "not-valid-base64-cipher";
    expect(decryptPII(invalid)).toBe(invalid);
  });

  it("한글, 특수문자, 긴 문자열 처리", () => {
    const cases = [
      "사업자등록번호: 123-45-67890",
      "가나다라마바사아자차카타파하",
      "!@#$%^&*()_+-=[]{}|;':\",./<>?",
      "a".repeat(1000),
    ];
    for (const plain of cases) {
      expect(decryptPII(encryptPII(plain))).toBe(plain);
    }
  });
});

describe("hashForSearch", () => {
  it("동일 입력은 동일 해시", () => {
    const h1 = hashForSearch("강남구 역삼동");
    const h2 = hashForSearch("강남구 역삼동");
    expect(h1).toBe(h2);
  });

  it("대소문자/공백 정규화", () => {
    const h1 = hashForSearch("  Hello World  ");
    const h2 = hashForSearch("hello world");
    expect(h1).toBe(h2);
  });

  it("빈 값은 빈 문자열", () => {
    expect(hashForSearch("")).toBe("");
  });

  it("해시는 hex 64자", () => {
    const hash = hashForSearch("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("SEARCH_INDEX_KEY 폴백 — 미설정 시 AUTH_SECRET 기반(하위호환), 설정 시 분리된 해시", () => {
    delete process.env.SEARCH_INDEX_KEY;
    const withAuth = hashForSearch("client@example.com");

    process.env.SEARCH_INDEX_KEY = "separate-search-index-key-for-vitest-32c!";
    const withSearchKey = hashForSearch("client@example.com");
    expect(withSearchKey).not.toBe(withAuth); // 키가 다르면 해시도 다름

    delete process.env.SEARCH_INDEX_KEY;
    expect(hashForSearch("client@example.com")).toBe(withAuth); // 미설정 시 AUTH_SECRET로 복귀
  });

  it("이메일 대소문자·공백 정규화로 동일 blind index (중복체크 일관성)", () => {
    expect(hashForSearch("  Client@Example.com ")).toBe(hashForSearch("client@example.com"));
  });
});

describe("maskBusinessNumber", () => {
  it("6자 이후 마스킹", () => {
    expect(maskBusinessNumber("1234567890")).toBe("123456****");
  });

  it("짧은 값은 **** 반환", () => {
    expect(maskBusinessNumber("123")).toBe("****");
    expect(maskBusinessNumber("")).toBe("****");
  });
});

describe("maskEmail", () => {
  it("로컬 파트 마스킹", () => {
    expect(maskEmail("hello@example.com")).toBe("he****@example.com");
  });

  it("짧은 로컬 파트", () => {
    expect(maskEmail("ab@example.com")).toBe("**@example.com");
  });

  it("도메인 없으면 ****", () => {
    expect(maskEmail("nodomain")).toBe("****");
  });
});

describe("PII_ENCRYPTION_KEY 미설정 시 에러 (S8: v1 폐기)", () => {
  it("PII_ENCRYPTION_KEY 없으면 encryptPII가 에러 발생", () => {
    const original = process.env.PII_ENCRYPTION_KEY;
    delete process.env.PII_ENCRYPTION_KEY;

    // v1(AUTH_SECRET) 폴백이 폐기됐으므로 PII_ENCRYPTION_KEY가 없으면 암호화 불가
    expect(() => encryptPII("test")).toThrow("PII_ENCRYPTION_KEY");

    process.env.PII_ENCRYPTION_KEY = original;
  });

  it("v2 prefix 없는 값은 평문으로 간주해 원본 반환 (v1 복호화 시도 안 함)", () => {
    // 과거 v1 암호문 포맷(prefix 없음)도 이제 평문처럼 원본 반환 — 운영 v1 0건 확인 후 폐기
    expect(decryptPII("no-prefix-legacy-value")).toBe("no-prefix-legacy-value");
  });
});
