/**
 * 위험요소 상호작용 매트릭스
 *
 * 복수 위험요소가 동시에 존재할 때 비선형 증폭 감점을 계산합니다.
 *
 * @module lib/risk/interaction-analyzer
 */

import type { RiskInteractionRule, RiskInteractionResult } from "../patent-types";
import type { RiskFactor } from "../risk-scoring";

// ─── 상호작용 규칙 ───

export const INTERACTION_RULES: RiskInteractionRule[] = [
  {
    id: "seizure_auction",
    factors: ["seizure", "auction"],
    amplifier: 1.5,
    description: "압류 + 경매개시: 진행 중인 강제처분 절차",
    rationale: "압류와 경매가 동시 진행 시 소유권 상실이 거의 확정적이며, 보증금 회수 가능성이 급격히 하락합니다.",
  },
  {
    id: "multi_mortgage_high_ratio",
    factors: ["multi_mortgage", "mortgage_high"],
    amplifier: 1.3,
    description: "다수 근저당 + 높은 근저당비율: 과도한 채무부담",
    rationale: "복수 채권자에게 과도한 담보가 설정된 상태로, 채무불이행 시 연쇄적 권리행사가 발생합니다.",
  },
  {
    id: "trust_mortgage",
    factors: ["trust", "multi_mortgage"],
    amplifier: 1.4,
    description: "신탁 + 다수 근저당: 복잡한 권리관계",
    rationale: "신탁 부동산에 다수 근저당이 설정된 경우, 수탁자·위탁자·채권자 간 이해관계가 극히 복잡합니다.",
  },
  {
    id: "seizure_lease",
    factors: ["seizure", "lease_registration"],
    amplifier: 1.6,
    description: "압류 + 임차권등기: 임차인 최악 시나리오",
    rationale: "기존 임차인의 보증금 미반환(임차권등기)에 더해 압류까지 진행 중이면, 후순위 임차인의 보증금 회수가 극히 어렵습니다.",
  },
  {
    id: "auction_extreme_mortgage",
    factors: ["auction", "mortgage_extreme"],
    amplifier: 1.7,
    description: "경매 + 초과채권: 회수 불가능 상태",
    rationale: "경매가 진행 중이며 채권이 시세를 초과하여 배당으로도 보증금 회수가 불가능합니다.",
  },
  {
    id: "seizure_disposition",
    factors: ["seizure", "disposition"],
    amplifier: 1.3,
    description: "압류 + 가처분: 복합 법적 분쟁",
    rationale: "재산 압류와 처분 금지가 동시에 걸린 상태로, 복수의 법적 분쟁이 진행 중입니다.",
  },
];

// ─── 상호작용 평가 ───

export function evaluateInteractions(factors: RiskFactor[]): RiskInteractionResult {
  const factorIds = new Set(factors.map((f) => f.id));
  const appliedRules: RiskInteractionResult["appliedRules"] = [];
  let totalPenalty = 0;

  for (const rule of INTERACTION_RULES) {
    // mortgage_high 패턴: mortgage_로 시작하는 모든 팩터 매칭
    const matched = rule.factors.every((ruleFactorId) => {
      if (ruleFactorId.includes("*")) {
        const prefix = ruleFactorId.replace("*", "");
        return factors.some((f) => f.id.startsWith(prefix));
      }
      return factorIds.has(ruleFactorId);
    });

    if (!matched) continue;

    // 매칭된 팩터들의 감점 합산
    const matchedFactors = rule.factors.map((rf) => {
      if (rf.includes("*")) {
        const prefix = rf.replace("*", "");
        return factors.find((f) => f.id.startsWith(prefix));
      }
      return factors.find((f) => f.id === rf);
    }).filter(Boolean) as RiskFactor[];

    const baseDeduction = matchedFactors.reduce((sum, f) => sum + f.deduction, 0);
    const amplifiedDeduction = Math.round(baseDeduction * rule.amplifier);
    const additional = amplifiedDeduction - baseDeduction;

    appliedRules.push({
      ruleId: rule.id,
      matchedFactors: matchedFactors.map((f) => f.id),
      baseDeduction,
      amplifiedDeduction,
      additionalDeduction: additional,
      description: rule.description,
    });

    totalPenalty += additional;
  }

  return { appliedRules, totalInteractionPenalty: totalPenalty };
}
