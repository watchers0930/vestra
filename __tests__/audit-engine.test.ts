import { describe, it, expect } from "vitest";
import {
  judgeRationality,
  assessRationality,
  calculateFeasibilityScore,
} from "@/lib/feasibility/audit-engine";
import type { VerificationResult, RationalityItem } from "@/lib/feasibility/feasibility-types";

describe("judgeRationality", () => {
  it("±10% 이내면 APPROPRIATE", () => {
    expect(judgeRationality(105, 100, "planned_sale_price")).toBe("APPROPRIATE");
    expect(judgeRationality(95, 100, "planned_sale_price")).toBe("APPROPRIATE");
  });

  it("수익 항목이 10-25% 높으면 OPTIMISTIC", () => {
    expect(judgeRationality(120, 100, "planned_sale_price")).toBe("OPTIMISTIC");
  });

  it("수익 항목이 25% 이상 높으면 UNREALISTIC", () => {
    expect(judgeRationality(130, 100, "planned_sale_price")).toBe("UNREALISTIC");
  });

  it("비용 항목이 10-25% 낮으면 OPTIMISTIC (비용은 낮을수록 낙관)", () => {
    expect(judgeRationality(80, 100, "total_construction_cost")).toBe("OPTIMISTIC");
  });

  it("벤치마크 0이면 APPROPRIATE 반환", () => {
    expect(judgeRationality(100, 0, "planned_sale_price")).toBe("APPROPRIATE");
  });
});

describe("assessRationality", () => {
  it("검증 결과를 합리성 판정으로 변환", () => {
    const verifications: VerificationResult[] = [
      {
        claimKey: "planned_sale_price",
        claimLabel: "분양가",
        claimValue: 2500,
        claimUnit: "만원/평",
        benchmark: {
          value: 2300,
          source: "MOLIT",
          sourceType: "molit",
          asOfDate: "2026-01-01",
        },
        deviation: 0.087,
        deviationPercent: 8.7,
      },
    ];

    const result = assessRationality(verifications);
    expect(result).toHaveLength(1);
    expect(result[0].grade).toBe("APPROPRIATE");
    expect(result[0].claimKey).toBe("planned_sale_price");
  });
});

describe("calculateFeasibilityScore", () => {
  it("전부 APPROPRIATE면 높은 점수", () => {
    const items: RationalityItem[] = [
      { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "APPROPRIATE", deviation: 5, reasoning: "", verificationSource: "" },
      { claimKey: "total_construction_cost", claimLabel: "공사비", grade: "APPROPRIATE", deviation: -3, reasoning: "", verificationSource: "" },
    ];

    const score = calculateFeasibilityScore(items);
    expect(score.score).toBe(90);
    expect(score.grade).toBe("A");
  });

  it("전부 UNREALISTIC이면 낮은 점수", () => {
    const items: RationalityItem[] = [
      { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "UNREALISTIC", deviation: 30, reasoning: "", verificationSource: "" },
    ];

    const score = calculateFeasibilityScore(items);
    expect(score.score).toBe(20);
    expect(score.grade).toBe("F");
  });

  it("빈 배열이면 0점", () => {
    const score = calculateFeasibilityScore([]);
    expect(score.score).toBe(0);
    expect(score.grade).toBe("F");
  });
});
