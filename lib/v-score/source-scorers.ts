/**
 * V-Score 개별 소스 점수 산출 + 상호작용 + 등급/설명
 *
 * @module lib/v-score/source-scorers
 */

import type { RiskScore, RiskGrade } from "../risk-scoring";
import type {
  VScoreSource,
  VScoreInteraction,
  VScoreExplanation,
  FraudRiskResult,
} from "../patent-types";
import type { ContractAnalysisResult } from "../contract-analyzer";
import type { PredictionResult } from "../prediction-engine";

// ─── 소스 키 타입 ───

export type SourceKey = "registry" | "price" | "contract" | "landlord" | "region";

// ─── 소스 간 상호작용 규칙 (비선형 보정) ───

interface InteractionRule {
  id: string;
  sourceA: SourceKey;
  sourceB: SourceKey;
  condition: (a: number, b: number) => boolean;
  adjustment: (a: number, b: number) => number;
  type: "amplify" | "mitigate" | "compound";
  description: string;
}

const INTERACTION_RULES: InteractionRule[] = [
  {
    id: "registry_price_compound",
    sourceA: "registry",
    sourceB: "price",
    condition: (a, b) => a < 50 && b < 50,
    adjustment: (a, b) => -Math.round((100 - a) * (100 - b) / 200),
    type: "compound",
    description: "등기 위험 + 시세 불안정 복합 위험 증폭",
  },
  {
    id: "registry_contract_amplify",
    sourceA: "registry",
    sourceB: "contract",
    condition: (a, b) => a < 40 && b < 40,
    adjustment: () => -8,
    type: "amplify",
    description: "등기 위험 + 계약서 위험 동시 발생 시 위험 증폭",
  },
  {
    id: "price_region_amplify",
    sourceA: "price",
    sourceB: "region",
    condition: (a, b) => a < 50 && b < 40,
    adjustment: () => -6,
    type: "amplify",
    description: "시세 불안정 + 사기 다발 지역 복합 위험",
  },
  {
    id: "landlord_registry_amplify",
    sourceA: "landlord",
    sourceB: "registry",
    condition: (a, b) => a < 40 && b < 50,
    adjustment: () => -5,
    type: "amplify",
    description: "임대인 위험 + 등기 위험 복합",
  },
  {
    id: "contract_price_mitigate",
    sourceA: "contract",
    sourceB: "price",
    condition: (a, b) => a >= 80 && b >= 70,
    adjustment: () => 3,
    type: "mitigate",
    description: "계약서 안전 + 시세 안정 시 위험 경감",
  },
  {
    id: "all_high_risk_cascade",
    sourceA: "registry",
    sourceB: "price",
    condition: (a, b) => a < 30 && b < 30,
    adjustment: () => -10,
    type: "compound",
    description: "다중 소스 고위험 캐스케이드",
  },
];

// ─── 등급 매핑 ───

const GRADE_MAP: Array<{ min: number; grade: RiskGrade; label: string }> = [
  { min: 85, grade: "A", label: "안전" },
  { min: 70, grade: "B", label: "양호" },
  { min: 50, grade: "C", label: "주의" },
  { min: 30, grade: "D", label: "위험" },
  { min: 0, grade: "F", label: "매우위험" },
];

export function getGradeInfo(score: number): { grade: RiskGrade; label: string } {
  for (const g of GRADE_MAP) {
    if (score >= g.min) return { grade: g.grade, label: g.label };
  }
  return { grade: "F", label: "매우위험" };
}

// ─── 개별 소스 점수 산출 함수 ───

/** 1. 등기 권리관계 점수 (0-100) */
export function calculateRegistryScore(riskScore?: RiskScore): {
  score: number;
  available: boolean;
  details: string;
} {
  if (!riskScore) {
    return { score: 50, available: false, details: "등기분석 데이터 없음 (기본값 50)" };
  }

  const score = riskScore.totalScore;
  const factorCount = riskScore.factors.length;
  const criticals = riskScore.factors.filter((f) => f.severity === "critical").length;

  return {
    score,
    available: true,
    details: `위험요소 ${factorCount}건 (심각 ${criticals}건), 등급 ${riskScore.grade}`,
  };
}

/** 2. 전세가율/시세 점수 (0-100) */
export function calculatePriceScore(
  jeonseRatio?: number,
  prediction?: PredictionResult,
  priceConfidence?: number,
): { score: number; available: boolean; details: string } {
  const factors: number[] = [];
  const detailParts: string[] = [];

  if (jeonseRatio !== undefined && jeonseRatio > 0) {
    let ratioScore: number;
    if (jeonseRatio <= 60) ratioScore = 95;
    else if (jeonseRatio <= 70) ratioScore = 80;
    else if (jeonseRatio <= 80) ratioScore = 55;
    else if (jeonseRatio <= 90) ratioScore = 30;
    else ratioScore = 10;
    factors.push(ratioScore);
    detailParts.push(`전세가율 ${jeonseRatio.toFixed(1)}% → ${ratioScore}점`);
  }

  if (prediction?.confidence !== undefined) {
    const stabilityScore = Math.min(100, Math.round(prediction.confidence * 100));
    factors.push(stabilityScore);
    detailParts.push(`예측 신뢰도 ${stabilityScore}점`);
  }

  if (priceConfidence !== undefined) {
    const confScore = Math.min(100, Math.round(priceConfidence * 100));
    factors.push(confScore);
  }

  if (factors.length === 0) {
    return { score: 50, available: false, details: "시세 데이터 없음 (기본값 50)" };
  }

  const score = Math.round(factors.reduce((a, b) => a + b, 0) / factors.length);
  return { score, available: true, details: detailParts.join(", ") };
}

/** 3. 계약서 위험도 점수 (0-100) */
export function calculateContractScore(
  contractResult?: ContractAnalysisResult,
): { score: number; available: boolean; details: string } {
  if (!contractResult) {
    return { score: 50, available: false, details: "계약분석 데이터 없음 (기본값 50)" };
  }

  const score = contractResult.safetyScore;
  const riskCount = contractResult.clauses.filter(
    (c) => c.riskLevel === "high" || c.riskLevel === "warning"
  ).length;
  const missingCount = contractResult.missingClauses.length;

  return {
    score,
    available: true,
    details: `안전점수 ${score}, 위험조항 ${riskCount}건, 누락 ${missingCount}건`,
  };
}

/** 4. 임대인 위험지표 점수 (0-100) */
export function calculateLandlordScore(
  riskScore?: RiskScore,
  creditScore?: number,
  isMultiHomeOwner?: boolean,
  isCorporate?: boolean,
): { score: number; available: boolean; details: string } {
  let score = 70;
  const detailParts: string[] = [];

  if (riskScore) {
    const transferPattern = riskScore.temporalPatterns?.patterns.find(
      (p) => p.patternType === "rapid_transfer"
    );
    if (transferPattern) {
      score -= 20;
      detailParts.push("잦은 소유권 이전 -20");
    }

    const mortgageCount = riskScore.factors.filter(
      (f) => f.category === "mortgage" || f.id.includes("mortgage")
    ).length;
    if (mortgageCount >= 3) {
      score -= 15;
      detailParts.push(`다중 근저당 ${mortgageCount}건 -15`);
    }
  }

  if (creditScore !== undefined) {
    if (creditScore >= 700) score += 10;
    else if (creditScore < 500) score -= 15;
    detailParts.push(`신용점수 ${creditScore}`);
  }

  if (isMultiHomeOwner) {
    score -= 10;
    detailParts.push("다주택자 -10");
  }
  if (isCorporate) {
    score -= 5;
    detailParts.push("법인 임대 -5");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    available: detailParts.length > 0,
    details: detailParts.length > 0 ? detailParts.join(", ") : "임대인 정보 제한적 (기본값 70)",
  };
}

/** 5. 지역 위험도 점수 (0-100) */
export function calculateRegionScore(
  fraudRisk?: FraudRiskResult,
  regionFraudRate?: number,
  auctionRate?: number,
): { score: number; available: boolean; details: string } {
  let score = 70;
  const detailParts: string[] = [];

  if (fraudRisk) {
    const fraudSafety = 100 - fraudRisk.fraudScore;
    score = Math.round(fraudSafety * 0.7 + score * 0.3);
    detailParts.push(`사기위험 ${fraudRisk.fraudScore}점`);
  }

  if (regionFraudRate !== undefined) {
    if (regionFraudRate > 5) score -= 20;
    else if (regionFraudRate > 2) score -= 10;
    else if (regionFraudRate > 1) score -= 5;
    detailParts.push(`사기발생률 ${regionFraudRate.toFixed(1)}%`);
  }

  if (auctionRate !== undefined) {
    if (auctionRate > 3) score -= 15;
    else if (auctionRate > 1.5) score -= 8;
    detailParts.push(`경매율 ${auctionRate.toFixed(1)}%`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    available: detailParts.length > 0,
    details: detailParts.length > 0 ? detailParts.join(", ") : "지역 데이터 제한적 (기본값 70)",
  };
}

// ─── 상호작용 계산 ───

export function calculateInteractions(
  sources: Map<string, number>,
): VScoreInteraction[] {
  const interactions: VScoreInteraction[] = [];

  for (const rule of INTERACTION_RULES) {
    const a = sources.get(rule.sourceA);
    const b = sources.get(rule.sourceB);
    if (a === undefined || b === undefined) continue;

    if (rule.condition(a, b)) {
      interactions.push({
        sourceA: rule.sourceA,
        sourceB: rule.sourceB,
        interactionType: rule.type,
        adjustment: rule.adjustment(a, b),
        description: rule.description,
      });
    }
  }

  return interactions;
}

// ─── 규칙 기반 설명 트리 ───

export function generateRuleBasedExplanation(
  sources: VScoreSource[],
  interactions: VScoreInteraction[],
  finalScore: number,
): VScoreExplanation {
  const sortedSources = [...sources].sort(
    (a, b) => a.score - b.score
  );

  const topRiskFactors = sortedSources
    .filter((s) => s.score < 70)
    .slice(0, 5)
    .map((s) => ({
      factor: s.name,
      impact: Math.round((100 - s.score) * s.weight),
      source: s.id,
    }));

  const parts: string[] = [];
  const { grade, label } = getGradeInfo(finalScore);

  parts.push(`V-Score ${finalScore}점 (${grade}등급: ${label}).`);

  const weakest = sortedSources[0];
  if (weakest && weakest.score < 70) {
    parts.push(
      `가장 주의가 필요한 영역: ${weakest.name} (${weakest.score}점). ${weakest.details}`
    );
  }

  const negativeInteractions = interactions.filter((i) => i.adjustment < 0);
  if (negativeInteractions.length > 0) {
    parts.push(
      `복합 위험 ${negativeInteractions.length}건 감지: ${negativeInteractions.map((i) => i.description).join("; ")}`
    );
  }

  const unavailable = sources.filter((s) => !s.dataAvailable);
  if (unavailable.length > 0) {
    parts.push(
      `※ ${unavailable.map((s) => s.name).join(", ")} 데이터 미확보 — 추가 자료 확보 시 정확도 향상 가능.`
    );
  }

  return {
    ruleBasedSummary: parts.join(" "),
    naturalLanguage: "",
    topRiskFactors,
  };
}
