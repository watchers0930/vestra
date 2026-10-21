import { describe, expect, it } from "vitest";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore, evaluateInteractions, type RiskFactor } from "@/lib/risk-scoring";

const mortgageRegistry = (ratio: number, count = 3) => {
  const parsed = parseRegistry(`【 표 제 부 】
서울특별시 강남구 테헤란로 123 아파트 84.97㎡
【 갑 구 】
1 소유권보존 2020년1월1일 소유자 홍길동
【 을 구 】
1 근저당권설정 2021년1월1일 채권최고액 금100000원 권리자 은행`);
  const total = Math.round(ratio * 10000);
  parsed.eulgu = Array.from({ length: count }, (_, i) => ({
    ...parsed.eulgu[0], order: i + 1, amount: total / count,
  }));
  parsed.summary.totalMortgageAmount = total;
  parsed.summary.activeEulguEntries = count;
  return parsed;
};

describe("근저당 복합위험 단조성", () => {
  it.each([
    [81, 0, "mortgage_high", "high", "total_claims_moderate"],
    [90, 0, "mortgage_high", "high", "total_claims_high"],
    [100.01, 0, "mortgage_very_high", "critical", "total_claims_critical"],
    [130, 0, "mortgage_extreme", "critical", "total_claims_critical"],
    [81, 100000, "mortgage_high", "high", "total_claims_high"],
  ] as const)("%s%%·보증금 %s: 감점 배정과 무관하게 고위험 경고 유지", (ratio, deposit, id, severity, claimsId) => {
    const score = calculateRiskScore(mortgageRegistry(ratio, 1), 1000000, deposit);
    expect(score.factors).toContainEqual(expect.objectContaining({ id, severity, deduction: 0 }));
    expect(score.factors).toContainEqual(expect.objectContaining({ id: claimsId, deduction: score.totalDeduction }));
    expect(score.factors.reduce((sum, f) => sum + f.deduction, 0)).toBe(score.totalDeduction);
    expect(score.summary).toMatch(/고위험|치명적/);
  });

  it.each([0, 100000])("보증금 %s: 채권 증가 시 안전점수가 상승하지 않는다", deposit => {
    const ratios = [50, 50.01, 60, 69.99, 70, 70.01, 79.99, 80, 80.01,
      81, 84.99, 85, 99.99, 100, 100.01, 119.99, 120, 120.01, 150];
    const scores = ratios.map(r => calculateRiskScore(mortgageRegistry(r), 1000000, deposit));
    scores.forEach((score, i) => {
      if (i) expect(score.totalScore).toBeLessThanOrEqual(scores[i - 1].totalScore);
      if (ratios[i] <= 80) return;
      const rule = score.interactionPenalties?.appliedRules.find(r => r.ruleId === "multi_mortgage_high_ratio");
      expect(rule).toBeDefined();
      expect(rule!.additionalDeduction).toBeGreaterThanOrEqual(9);
      if (i && ratios[i - 1] > 80) {
        expect(score.interactionPenalties!.totalInteractionPenalty)
          .toBeGreaterThanOrEqual(scores[i - 1].interactionPenalties!.totalInteractionPenalty);
      }
    });
  });

  it.each(["high", "critical"] as const)("factor id가 달라도 근저당 %s 이상은 규칙에 포함", severity => {
    const factor = (id: string, level: RiskFactor["severity"], deduction: number): RiskFactor => ({
      id, category: "근저당", severity: level, deduction, description: "근저당 위험", detail: "",
    });
    const multi = factor("multi_mortgage", "medium", 10);
    expect(evaluateInteractions([multi, factor("new_mortgage_level", severity, 25)]).totalInteractionPenalty).toBe(11);
    expect(evaluateInteractions([multi, factor("mortgage_elevated", "medium", 10)]).totalInteractionPenalty).toBe(0);
  });
});
