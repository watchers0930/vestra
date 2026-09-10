/**
 * P0-3 blind index 듀얼리드 테스트
 * - SEARCH_INDEX_KEY 미설정: 신규키==구키 → 후보 1개(기존과 완전 호환).
 * - SEARCH_INDEX_KEY 설정: 신규≠구 → 후보 2개(전환기 신·구 매칭).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashForSearch, hashForSearchLegacy, hashForSearchCandidates } from "@/lib/crypto";

const ORIG = { auth: process.env.AUTH_SECRET, search: process.env.SEARCH_INDEX_KEY };

beforeEach(() => {
  process.env.AUTH_SECRET = "test-auth-secret-xyz";
  delete process.env.SEARCH_INDEX_KEY;
});
afterEach(() => {
  process.env.AUTH_SECRET = ORIG.auth;
  if (ORIG.search === undefined) delete process.env.SEARCH_INDEX_KEY;
  else process.env.SEARCH_INDEX_KEY = ORIG.search;
});

describe("blind index 듀얼리드", () => {
  it("SEARCH_INDEX_KEY 미설정 시 신규키==구키, 후보 1개(무변경 호환)", () => {
    expect(hashForSearch("a@b.com")).toBe(hashForSearchLegacy("a@b.com"));
    expect(hashForSearchCandidates("a@b.com")).toHaveLength(1);
  });

  it("SEARCH_INDEX_KEY 설정 시 신규≠구, 후보 2개(신규 우선)", () => {
    process.env.SEARCH_INDEX_KEY = "dedicated-search-key-123";
    const primary = hashForSearch("a@b.com");
    const legacy = hashForSearchLegacy("a@b.com");
    expect(primary).not.toBe(legacy);
    const cand = hashForSearchCandidates("a@b.com");
    expect(cand).toEqual([primary, legacy]);
  });

  it("정규화 일관성: 대소문자·공백 무시", () => {
    expect(hashForSearch("  A@B.COM ")).toBe(hashForSearch("a@b.com"));
  });

  it("빈 값은 빈 문자열/빈 후보", () => {
    expect(hashForSearch("")).toBe("");
    expect(hashForSearchCandidates("")).toEqual([]);
  });
});
