import { describe, it, expect } from "vitest";
import { extractAmount } from "@/lib/registry-parser";

describe("extractAmount", () => {
  it("금 480,000,000원 → 480000000", () => {
    expect(extractAmount("채권최고액 금 480,000,000원")).toBe(480000000);
  });

  it("금3억5,000만원 → 350000000", () => {
    expect(extractAmount("금3억5,000만원")).toBe(350000000);
  });

  it("금3억원 → 300000000", () => {
    expect(extractAmount("금3억원")).toBe(300000000);
  });

  it("금5,000만원 → 50000000", () => {
    expect(extractAmount("금5,000만원")).toBe(50000000);
  });

  it("금 550,000,000원 → 550000000", () => {
    expect(extractAmount("전세금 금 550,000,000원")).toBe(550000000);
  });

  it("빈 문자열 → 0", () => {
    expect(extractAmount("")).toBe(0);
  });

  it("금액 없는 텍스트 → 0", () => {
    expect(extractAmount("소유권이전 매매")).toBe(0);
  });
});
