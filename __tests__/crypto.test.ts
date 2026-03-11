/**
 * lib/crypto.ts 테스트
 * PII 암호화/복호화, 해시, 마스킹 검증
 */
import { describe, it, expect, beforeAll } from "vitest";

// AUTH_SECRET 설정 (테스트용)
beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-key-for-vitest-32chars!!";
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

describe("AUTH_SECRET 미설정 시 에러", () => {
  it("AUTH_SECRET 없으면 encryptPII가 에러 발생", () => {
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;

    // 모듈이 이미 로드되어 있으므로 getSecret()이 호출될 때 에러
    // crypto 모듈의 getSecret은 매번 process.env를 읽음
    expect(() => encryptPII("test")).toThrow("AUTH_SECRET");

    process.env.AUTH_SECRET = original;
  });
});
