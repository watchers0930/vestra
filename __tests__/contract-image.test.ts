import { describe, it, expect } from "vitest";
import { coerceIntegrity, emptyIntegrity } from "@/lib/contract-image";

describe("coerceIntegrity", () => {
  it("완전한 raw 객체를 그대로 정규화한다", () => {
    const r = coerceIntegrity({
      signaturePresent: { landlord: "present", tenant: "absent" },
      sealPresent: { landlord: "unclear", tenant: "present" },
      handwrittenEdits: true,
      handwrittenEditNote: "  보증금 금액 수정  ",
      blankFields: ["잔금일", "", "  보증금  "],
      illegibleAreas: true,
      illegibleNote: "우측 하단 훼손",
      warnings: ["임차인 서명이 확인되지 않습니다.", 123, ""],
    });
    expect(r.available).toBe(true);
    expect(r.signaturePresent).toEqual({ landlord: "present", tenant: "absent" });
    expect(r.sealPresent).toEqual({ landlord: "unclear", tenant: "present" });
    expect(r.handwrittenEdits).toBe(true);
    expect(r.handwrittenEditNote).toBe("보증금 금액 수정");
    expect(r.blankFields).toEqual(["잔금일", "보증금"]);
    expect(r.illegibleAreas).toBe(true);
    expect(r.illegibleNote).toBe("우측 하단 훼손");
    expect(r.warnings).toEqual(["임차인 서명이 확인되지 않습니다."]);
  });

  it("잘못된 presence 값은 unclear로 폴백한다", () => {
    const r = coerceIntegrity({
      signaturePresent: { landlord: "yes", tenant: null },
      sealPresent: "nope",
    });
    expect(r.signaturePresent).toEqual({ landlord: "unclear", tenant: "unclear" });
    expect(r.sealPresent).toEqual({ landlord: "unclear", tenant: "unclear" });
  });

  it("null·비객체 입력에도 안전한 기본값을 만든다", () => {
    for (const bad of [null, undefined, "x", 42, []]) {
      const r = coerceIntegrity(bad as unknown);
      expect(r.available).toBe(true);
      expect(r.blankFields).toEqual([]);
      expect(r.warnings).toEqual([]);
      expect(r.handwrittenEdits).toBe(false);
      expect(r.handwrittenEditNote).toBeUndefined();
    }
  });

  it("빈 문자열 note는 undefined로 처리한다", () => {
    const r = coerceIntegrity({ handwrittenEditNote: "   ", illegibleNote: "" });
    expect(r.handwrittenEditNote).toBeUndefined();
    expect(r.illegibleNote).toBeUndefined();
  });

  it("배열은 최대 20개로 제한한다", () => {
    const many = Array.from({ length: 30 }, (_, i) => `항목${i}`);
    const r = coerceIntegrity({ blankFields: many, warnings: many });
    expect(r.blankFields).toHaveLength(20);
    expect(r.warnings).toHaveLength(20);
  });
});

describe("emptyIntegrity", () => {
  it("기본은 available=false", () => {
    expect(emptyIntegrity().available).toBe(false);
  });
  it("available 인자를 반영한다", () => {
    expect(emptyIntegrity(true).available).toBe(true);
  });
  it("모든 신호가 안전한 기본값이다", () => {
    const e = emptyIntegrity();
    expect(e.signaturePresent).toEqual({ landlord: "unclear", tenant: "unclear" });
    expect(e.handwrittenEdits).toBe(false);
    expect(e.blankFields).toEqual([]);
    expect(e.illegibleAreas).toBe(false);
    expect(e.warnings).toEqual([]);
  });
});
