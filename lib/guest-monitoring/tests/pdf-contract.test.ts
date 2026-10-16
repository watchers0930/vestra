import { describe, expect, it } from "vitest";
import { applicantSchema, identityStartSchema } from "../schemas";
import { parseUnitNumber, registryPropertyFields } from "../property-fields";
import { parseRegistry, SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import { ownerNameMatches } from "../owner-match";
import { buildSignalSummary } from "../signal-message";
import { parseStrictJson } from "../strict-json";
import { extractRegistryFields } from "../pdf-extraction";

const applicant = { guestName: "홍길동", guestPhone: "010-1234-5678" };
describe("PDF-only input contract", () => {
  it("accepts only name and phone, and requires role only on apply", () => {
    expect(applicantSchema.safeParse(applicant).success).toBe(true);
    for (const key of ["address", "dong", "ho", "unitNumber", "ownerName", "commUniqueNo", "amount"]) {
      expect(applicantSchema.safeParse({ ...applicant, [key]: "injected" }).success).toBe(false);
    }
    const apply = { ...applicant, purpose: "apply", draftId: "draft" };
    expect(identityStartSchema.safeParse(apply).success).toBe(false);
    for (const role of ["owner", "tenant"]) expect(identityStartSchema.safeParse({ ...apply, role }).success).toBe(true);
    for (const role of ["admin", "", null, ["owner"]]) expect(identityStartSchema.safeParse({ ...apply, role }).success).toBe(false);
    for (const purpose of ["status", "renewal"]) {
      expect(identityStartSchema.safeParse({ ...applicant, purpose }).success).toBe(true);
      expect(identityStartSchema.safeParse({ ...applicant, purpose, role: "owner" }).success).toBe(false);
      expect(identityStartSchema.safeParse({ ...applicant, purpose, draftId: "draft" }).success).toBe(false);
    }
  });
  it("rejects duplicate JSON keys including escaped aliases", () => {
    expect(() => parseStrictJson('{"role":"owner","role":"tenant"}')).toThrow("invalid_input");
    expect(() => parseStrictJson('{"role":"owner","\\u0072ole":"tenant"}')).toThrow("invalid_input");
    expect(parseStrictJson('{"value":[{"id":1},{"id":2}],"text":"a,b:{x}"}')).toEqual({ value: [{ id: 1 }, { id: 2 }], text: "a,b:{x}" });
  });
});
describe("registry property and owner truth", () => {
  it.each([
    ["제101동 제15층 제1502호", { dong: "101", ho: "1502" }],
    ["제15층 제1502호", { dong: "", ho: "1502" }],
    ["제15층", { dong: "", ho: "" }],
    ["역삼동 123-45", { dong: "", ho: "" }],
  ])("parses title unit %s", (value, expected) => expect(parseUnitNumber(value)).toEqual(expected));
  it("appends units exactly once and does not infer aggregate from a building name", () => {
    const title = { ...parseRegistry(SAMPLE_REGISTRY_TEXT).title, address: "서울 강남구 테스트로 1", isApartment: true, unitNumber: "제101동 제15층 제1502호" };
    const result = registryPropertyFields(title);
    expect(result.address).toBe("서울 강남구 테스트로 1 101동 1502호");
    expect(registryPropertyFields({ ...title, address: result.address }).address).toBe(result.address);
    expect(registryPropertyFields({ ...title, isApartment: false }).unitNumber).toEqual({ buildingDong: "", unitHo: "", isAggregate: false });
  });
  it("rejects an aggregate registry without a confirmed unit", () => {
    const text = SAMPLE_REGISTRY_TEXT.replace("제101동 제15층 제1502호", "전유부분 건물의 표시 제15층");
    expect(() => extractRegistryFields(text)).toThrow("extraction_incomplete");
  });
  it("matches full normalized names only", () => {
    expect(ownerNameMatches(" 홍 길 동 ", "홍길동")).toBe(true);
    expect(ownerNameMatches("Ｊｏ Ｋｉｍ", "JoKim")).toBe(true);
    expect(ownerNameMatches("홍길", "홍길동")).toBe(false);
    expect(ownerNameMatches("홍길동", "홍길순")).toBe(false);
  });
});
describe("role signal wording", () => {
  it("uses neutral text for legacy rows and non-alert outcomes", () => {
    expect(buildSignalSummary(null, "signal_detected")).toContain("최신 등기부");
    for (const result of ["no_change", "fetch_failed", "needs_registration"]) {
      expect(buildSignalSummary("owner", result)).toBe(buildSignalSummary("tenant", result));
    }
    expect(buildSignalSummary("owner", "unknown")).toBeNull();
    expect(buildSignalSummary("owner", "__proto__")).toBeNull();
  });
  it("keeps preliminary signals distinct from confirmed case types", () => {
    expect(buildSignalSummary("owner", "signal_detected", "mortgage", "received")).not.toContain("근저당");
    expect(buildSignalSummary("owner", "signal_detected")).toContain("명의도용 여부");
    expect(buildSignalSummary("tenant", "signal_detected")).toContain("보증금 위험");
    expect(buildSignalSummary("tenant", "signal_detected", "seizure", "completed")).toContain("압류");
    expect(buildSignalSummary("owner", "signal_detected", "<upstream>", "completed")).not.toContain("<upstream>");
  });
});
