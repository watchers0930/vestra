/**
 * blind index hashForSearch 테스트
 * P0-3 전환·백필 완료로 legacy/candidates 폴백은 제거됨 → 신규키 단일 해시.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashForSearch } from "@/lib/crypto";

const ORIG = { auth: process.env.AUTH_SECRET, search: process.env.SEARCH_INDEX_KEY };

beforeEach(() => {
  process.env.AUTH_SECRET = "test-auth-secret-xyz";
});
afterEach(() => {
  process.env.AUTH_SECRET = ORIG.auth;
  if (ORIG.search === undefined) delete process.env.SEARCH_INDEX_KEY;
  else process.env.SEARCH_INDEX_KEY = ORIG.search;
});

describe("hashForSearch (blind index)", () => {
  it("SEARCH_INDEX_KEY가 있으면 AUTH_SECRET과 다른 해시(키 분리)", () => {
    delete process.env.SEARCH_INDEX_KEY;
    const authBased = hashForSearch("a@b.com");
    process.env.SEARCH_INDEX_KEY = "dedicated-search-key-123";
    const dedicated = hashForSearch("a@b.com");
    expect(dedicated).not.toBe(authBased);
  });

  it("정규화 일관성: 대소문자·공백 무시", () => {
    expect(hashForSearch("  A@B.COM ")).toBe(hashForSearch("a@b.com"));
  });

  it("빈 값은 빈 문자열", () => {
    expect(hashForSearch("")).toBe("");
  });

  it("결정적: 같은 입력·키면 같은 해시", () => {
    process.env.SEARCH_INDEX_KEY = "k";
    expect(hashForSearch("x@y.com")).toBe(hashForSearch("x@y.com"));
  });
});
