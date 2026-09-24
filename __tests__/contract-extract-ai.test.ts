import { describe, it, expect } from "vitest";
import { coerceExtractedAI } from "@/lib/contract-extract-ai";
import { mergeExtractedInfo, cleanPartyName, type ContractExtractedInfo } from "@/lib/contract-analyzer";

describe("coerceExtractedAI", () => {
  it("정상 값을 정규화한다(문자열 금액·다양한 날짜형식)", () => {
    const r = coerceExtractedAI({
      propertyAddress: "서울 관악구 봉천동 1234-5 202호",
      landlordName: "김철수",
      tenantName: "이영희",
      depositAmount: 250000000,
      monthlyRentAmount: null,
      contractStartDate: "2026.12.15",
      contractEndDate: "2028년 12월 14일",
      paymentSchedule: [
        { label: "계약금", amount: "25,000,000원", dueDate: null },
        { label: "잔금", amount: 225000000, dueDate: "2026-12-15" },
      ],
    });
    expect(r.landlordName).toBe("김철수");
    expect(r.depositAmount).toBe(250000000);
    expect(r.monthlyRentAmount).toBeUndefined();
    expect(r.contractStartDate).toBe("2026-12-15");
    expect(r.contractEndDate).toBe("2028-12-14");
    expect(r.paymentSchedule).toHaveLength(2);
    expect(r.paymentSchedule![0].amount).toBe(25000000);
  });

  it("라벨/일반어를 이름으로 오인하지 않는다", () => {
    for (const bad of ["성명", "임대인", "임차인", "쌍방", "갑", "을", "당사자"]) {
      expect(coerceExtractedAI({ landlordName: bad }).landlordName).toBeUndefined();
    }
    expect(coerceExtractedAI({ landlordName: "홍길동" }).landlordName).toBe("홍길동");
  });

  it("잘못된 지급 label·금액을 걸러낸다", () => {
    const r = coerceExtractedAI({
      paymentSchedule: [
        { label: "쓰레기", amount: 1 },
        { label: "중도금", amount: -5 },
        { label: "잔금", amount: 100000000 },
      ],
    });
    expect(r.paymentSchedule).toHaveLength(2); // 쓰레기 제외
    expect(r.paymentSchedule!.find((p) => p.label === "중도금")?.amount).toBeUndefined();
  });

  it("null·비객체 입력에 안전하다", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      const r = coerceExtractedAI(bad as unknown);
      expect(r.landlordName).toBeUndefined();
      expect(r.paymentSchedule).toEqual([]);
    }
  });

  it("propertyDetails: label-value 표 항목을 정규화한다", () => {
    const r = coerceExtractedAI({
      propertyDetails: [
        { label: "소재지", value: "서울특별시 금천구 가산동 219-5 813호" },
        { label: "지목", value: "공장용지" },
        { label: "건물 면적", value: "40.8㎡" },
        { label: "", value: "라벨없음(제외)" },
        { label: "값없음(제외)", value: "" },
        { label: "숫자값(제외)", value: 123 },
        "문자열(제외)",
      ],
    });
    expect(r.propertyDetails).toHaveLength(3);
    expect(r.propertyDetails![0]).toEqual({ label: "소재지", value: "서울특별시 금천구 가산동 219-5 813호" });
    expect(r.propertyDetails![1].label).toBe("지목");
  });

  it("propertyDetails: 배열 아니면 빈 배열", () => {
    expect(coerceExtractedAI({ propertyDetails: "x" }).propertyDetails).toEqual([]);
    expect(coerceExtractedAI({}).propertyDetails).toEqual([]);
  });
});

describe("cleanPartyName (정규식 baseline 이름 정제)", () => {
  it("라벨·일반어를 배제한다(동의·쌍방은 등)", () => {
    expect(cleanPartyName("동의")).toBeUndefined();
    expect(cleanPartyName("쌍방은")).toBeUndefined(); // 조사 제거→'쌍방'→stopword
    expect(cleanPartyName("성명")).toBeUndefined();
    expect(cleanPartyName("임대인")).toBeUndefined();
    expect(cleanPartyName("주소")).toBeUndefined();
  });

  it("끝 조사를 제거하고 이름만 남긴다", () => {
    expect(cleanPartyName("김철수와")).toBe("김철수");
    expect(cleanPartyName("이영희는")).toBe("이영희");
    expect(cleanPartyName("박민준을")).toBe("박민준");
  });

  it("정상 이름은 그대로 통과(복성 포함)", () => {
    expect(cleanPartyName("홍길동")).toBe("홍길동");
    expect(cleanPartyName("남궁민수")).toBe("남궁민수");
  });

  it("빈 값·과도한 길이는 undefined", () => {
    expect(cleanPartyName(undefined)).toBeUndefined();
    expect(cleanPartyName("가")).toBeUndefined();
    expect(cleanPartyName("일이삼사오육칠")).toBeUndefined();
  });
});

describe("mergeExtractedInfo", () => {
  const base: ContractExtractedInfo = {
    landlordName: "성명", // 정규식 오추출
    tenantName: "쌍방은",
    depositAmount: undefined,
    contractStartDate: "2026-12-15",
    contractEndDate: "2028-12-14",
    durationMonths: 24,
    paymentSchedule: [],
  };

  it("override(AI) 값이 우선하고 없으면 baseline 폴백", () => {
    const merged = mergeExtractedInfo(base, {
      landlordName: "김철수",
      tenantName: "이영희",
      depositAmount: 250000000,
      paymentSchedule: [{ label: "잔금", amount: 225000000, rawText: "잔금" }],
    });
    expect(merged.landlordName).toBe("김철수");
    expect(merged.tenantName).toBe("이영희");
    expect(merged.depositAmount).toBe(250000000);
    expect(merged.contractStartDate).toBe("2026-12-15"); // baseline 유지
    expect(merged.paymentSchedule).toHaveLength(1);
  });

  it("override가 없으면 baseline 그대로", () => {
    expect(mergeExtractedInfo(base, null)).toEqual(base);
    expect(mergeExtractedInfo(base, undefined)).toEqual(base);
  });

  it("빈 paymentSchedule override는 baseline 폴백", () => {
    const b = { ...base, paymentSchedule: [{ label: "잔금" as const, amount: 1, rawText: "x" }] };
    const merged = mergeExtractedInfo(b, { paymentSchedule: [] });
    expect(merged.paymentSchedule).toHaveLength(1);
  });

  it("durationMonths 미지정 시 날짜로 재계산", () => {
    const b: ContractExtractedInfo = { paymentSchedule: [] };
    const merged = mergeExtractedInfo(b, {
      contractStartDate: "2026-01-01",
      contractEndDate: "2028-01-01",
    });
    expect(merged.durationMonths).toBe(24);
  });
});
