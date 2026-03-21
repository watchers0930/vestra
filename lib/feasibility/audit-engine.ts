/**
 * 합리성 판정 엔진 (Rationality Audit Engine)
 *
 * 벤치마크 대비 괴리율로 업체 주장의 합리성을 3단계로 판정하고
 * V-Score 패턴을 응용하여 종합 사업성 점수를 산출합니다.
 *
 * @module lib/feasibility/audit-engine
 */

import type {
  VerificationResult,
  RationalityGrade,
  RationalityItem,
  FeasibilityScore,
} from "./feasibility-types";
import { CLAIM_LABELS, type ClaimKey } from "./feasibility-types";

// ---------------------------------------------------------------------------
// 합리성 등급 판정
// ---------------------------------------------------------------------------

// 수익 측 항목: 높을수록 낙관적 (분양가, 분양률, 수익률)
const REVENUE_CLAIMS = new Set([
  "planned_sale_price",
  "expected_sale_rate",
  "expected_profit_rate",
  "total_revenue",
  "rental_income",
  "operation_income",
]);

// 비용 측 항목: 낮을수록 낙관적 (공사비, PF금리)
const COST_CLAIMS = new Set([
  "total_construction_cost",
  "construction_cost_per_pyeong",
  "pf_interest_rate",
  "total_project_cost",
  "land_cost",
]);

export function judgeRationality(
  claimValue: number,
  benchmarkValue: number,
  claimKey: string
): RationalityGrade {
  if (benchmarkValue === 0) return "APPROPRIATE";

  const deviation = (claimValue - benchmarkValue) / benchmarkValue;

  // 비용 항목은 방향 반전 (낮으면 낙관적)
  const isCost = COST_CLAIMS.has(claimKey);
  const adjustedDeviation = isCost ? -deviation : deviation;

  // 절대값 기준 판정
  const absDeviation = Math.abs(deviation);

  if (absDeviation <= 0.10) return "APPROPRIATE"; // ±10% 이내
  if (adjustedDeviation > 0.25) return "UNREALISTIC"; // 25% 이상 유리
  if (adjustedDeviation > 0.10) return "OPTIMISTIC"; // 10-25% 유리
  if (adjustedDeviation < -0.25) return "UNREALISTIC"; // 25% 이상 불리
  return "CONSERVATIVE"; // 10-25% 불리
}

// ---------------------------------------------------------------------------
// 판정 사유 생성
// ---------------------------------------------------------------------------

export function generateReasoning(verification: VerificationResult): string {
  const { claimLabel, claimValue, claimUnit, benchmark, deviationPercent } = verification;
  const absDeviation = Math.abs(deviationPercent).toFixed(1);
  const direction = deviationPercent > 0 ? "높게" : "낮게";

  const benchmarkDesc = `${benchmark.source} 기준 ${benchmark.value.toLocaleString()}${claimUnit}`;

  if (Math.abs(deviationPercent) <= 10) {
    return `${claimLabel} ${claimValue.toLocaleString()}${claimUnit}은(는) ${benchmarkDesc} 대비 ` +
      `${absDeviation}% 차이로 적정 범위 내입니다.`;
  }

  return `${claimLabel} ${claimValue.toLocaleString()}${claimUnit}은(는) ${benchmarkDesc} 대비 ` +
    `${absDeviation}% ${direction} 책정되었습니다.`;
}

// ---------------------------------------------------------------------------
// 검증 결과 → 합리성 판정 변환
// ---------------------------------------------------------------------------

export function assessRationality(
  verifications: VerificationResult[]
): RationalityItem[] {
  return verifications.map((v) => ({
    claimKey: v.claimKey,
    claimLabel: v.claimLabel,
    grade: judgeRationality(v.claimValue, v.benchmark.value, v.claimKey),
    deviation: v.deviationPercent,
    reasoning: generateReasoning(v),
    verificationSource: v.benchmark.source,
  }));
}

// ---------------------------------------------------------------------------
// V-Score 산출 (종합 사업성 점수)
// ---------------------------------------------------------------------------

const WEIGHTS: Record<string, number> = {
  planned_sale_price: 0.25,
  total_construction_cost: 0.20,
  construction_cost_per_pyeong: 0.20,
  expected_sale_rate: 0.15,
  pf_interest_rate: 0.10,
  expected_profit_rate: 0.10,
};

const GRADE_SCORES: Record<RationalityGrade, number> = {
  APPROPRIATE: 90,
  CONSERVATIVE: 80,
  OPTIMISTIC: 55,
  UNREALISTIC: 20,
};

const FEASIBILITY_GRADE_LABELS: Record<string, string> = {
  A: "투자적격",
  B: "조건부적격",
  C: "주의",
  D: "부적격",
  F: "투자불가",
};

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function calculateFeasibilityScore(
  items: RationalityItem[]
): FeasibilityScore {
  let totalScore = 0;
  let totalWeight = 0;
  const breakdown: FeasibilityScore["breakdown"] = [];

  for (const item of items) {
    const weight = WEIGHTS[item.claimKey] || 0.05;
    const score = GRADE_SCORES[item.grade];
    totalScore += score * weight;
    totalWeight += weight;

    breakdown.push({
      category: item.claimLabel,
      weight,
      score,
      grade: item.grade,
    });
  }

  // 검증 항목이 없으면 데이터 부족으로 "주의" 등급 (55점) 부여
  // 0점은 "분석 불가"와 혼동되므로 최소 점수 보장
  const finalScore = totalWeight > 0
    ? Math.round(totalScore / totalWeight)
    : items.length > 0 ? 55 : 0;
  const grade = scoreToGrade(finalScore);

  return {
    score: finalScore,
    grade,
    gradeLabel: FEASIBILITY_GRADE_LABELS[grade],
    breakdown,
    investmentOpinion: "", // LLM이 채움
  };
}
