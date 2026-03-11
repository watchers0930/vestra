/**
 * VESTRA V-Score 통합 위험도 점수화 알고리즘
 * ──────────────────────────────────────────
 * 특허 핵심: 이질적 데이터(등기부등본 권리관계 + 전세가율 + 시세 변동성 +
 * 임대인 재무 위험 지표 + 지역 위험도)를 복합 분석하여 단일 수치(0~100)로
 * 통합 산출하는 고유 알고리즘.
 *
 * 순수 TypeScript 구현. AI/LLM 호출 없음 (설명 생성은 별도 프롬프트 레이어).
 * 알고리즘 ID: VESTRA-VSCORE-v1.0.0
 */

import type { RiskScore, RiskGrade } from "./risk-scoring";
import type {
  VScoreResult,
  VScoreSource,
  VScoreInteraction,
  VScoreExplanation,
  FraudRiskResult,
} from "./patent-types";
import type { ContractAnalysisResult } from "./contract-analyzer";
import type { PredictionResult } from "./prediction-engine";

// ─── 가중치 벡터 (특허 청구항 핵심) ───

const SOURCE_WEIGHTS = {
  registry: 0.30,    // 등기 권리관계
  price: 0.25,       // 전세가율/시세
  contract: 0.20,    // 계약서 위험도
  landlord: 0.15,    // 임대인 위험지표
  region: 0.10,      // 지역 위험도
} as const;

// ─── 소스 간 상호작용 규칙 (비선형 보정) ───

interface InteractionRule {
  id: string;
  sourceA: keyof typeof SOURCE_WEIGHTS;
  sourceB: keyof typeof SOURCE_WEIGHTS;
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

function getGradeInfo(score: number): { grade: RiskGrade; label: string } {
  for (const g of GRADE_MAP) {
    if (score >= g.min) return { grade: g.grade, label: g.label };
  }
  return { grade: "F", label: "매우위험" };
}

// ─── 개별 소스 점수 산출 함수 ───

/**
 * 1. 등기 권리관계 점수 (0-100)
 * risk-scoring.ts의 결정론적 결과를 직접 사용
 */
function calculateRegistryScore(riskScore?: RiskScore): {
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

/**
 * 2. 전세가율/시세 점수 (0-100)
 * 전세가율, 시세 변동성, 예측 신뢰도를 종합
 */
function calculatePriceScore(
  jeonseRatio?: number,
  prediction?: PredictionResult,
  priceConfidence?: number,
): { score: number; available: boolean; details: string } {
  const factors: number[] = [];
  const detailParts: string[] = [];

  // 전세가율 점수 (0-100)
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

  // 시세 변동성 점수
  if (prediction?.confidence !== undefined) {
    const stabilityScore = Math.min(100, Math.round(prediction.confidence * 100));
    factors.push(stabilityScore);
    detailParts.push(`예측 신뢰도 ${stabilityScore}점`);
  }

  // 가격 데이터 신뢰도
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

/**
 * 3. 계약서 위험도 점수 (0-100)
 */
function calculateContractScore(
  contractResult?: ContractAnalysisResult,
): { score: number; available: boolean; details: string } {
  if (!contractResult) {
    return { score: 50, available: false, details: "계약분석 데이터 없음 (기본값 50)" };
  }

  // safetyScore는 0-100 (높을수록 안전)
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

/**
 * 4. 임대인 위험지표 점수 (0-100)
 * 등기부등본에서 추출 가능한 간접 지표 + 신용정보 (mock)
 */
function calculateLandlordScore(
  riskScore?: RiskScore,
  creditScore?: number,
  isMultiHomeOwner?: boolean,
  isCorporate?: boolean,
): { score: number; available: boolean; details: string } {
  let score = 70; // 기본값
  const detailParts: string[] = [];

  // 소유권 이전 빈도 (투기성)
  if (riskScore) {
    const transferPattern = riskScore.temporalPatterns?.patterns.find(
      (p) => p.patternType === "rapid_transfer"
    );
    if (transferPattern) {
      score -= 20;
      detailParts.push("잦은 소유권 이전 -20");
    }

    // 다중 근저당 (재무 부담 추정)
    const mortgageCount = riskScore.factors.filter(
      (f) => f.category === "mortgage" || f.id.includes("mortgage")
    ).length;
    if (mortgageCount >= 3) {
      score -= 15;
      detailParts.push(`다중 근저당 ${mortgageCount}건 -15`);
    }
  }

  // 신용정보 (mock 연동)
  if (creditScore !== undefined) {
    if (creditScore >= 700) score += 10;
    else if (creditScore < 500) score -= 15;
    detailParts.push(`신용점수 ${creditScore}`);
  }

  // 다주택자/법인
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

/**
 * 5. 지역 위험도 점수 (0-100)
 * 전세사기 피해사례 밀도 + 경매 발생률
 */
function calculateRegionScore(
  fraudRisk?: FraudRiskResult,
  regionFraudRate?: number,
  auctionRate?: number,
): { score: number; available: boolean; details: string } {
  let score = 70; // 기본값
  const detailParts: string[] = [];

  // 전세사기 위험 평가 결과 반영
  if (fraudRisk) {
    // fraudScore는 0-100 (높을수록 위험) → 반전
    const fraudSafety = 100 - fraudRisk.fraudScore;
    score = Math.round(fraudSafety * 0.7 + score * 0.3);
    detailParts.push(`사기위험 ${fraudRisk.fraudScore}점`);
  }

  // 지역 사기 발생률
  if (regionFraudRate !== undefined) {
    if (regionFraudRate > 5) score -= 20;
    else if (regionFraudRate > 2) score -= 10;
    else if (regionFraudRate > 1) score -= 5;
    detailParts.push(`사기발생률 ${regionFraudRate.toFixed(1)}%`);
  }

  // 경매 발생률
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

function calculateInteractions(
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

function generateRuleBasedExplanation(
  sources: VScoreSource[],
  interactions: VScoreInteraction[],
  finalScore: number,
): VScoreExplanation {
  const sortedSources = [...sources].sort(
    (a, b) => a.score - b.score
  ); // 낮은 점수(위험한) 순

  const topRiskFactors = sortedSources
    .filter((s) => s.score < 70)
    .slice(0, 5)
    .map((s) => ({
      factor: s.name,
      impact: Math.round((100 - s.score) * s.weight),
      source: s.id,
    }));

  // 구조화 설명 생성
  const parts: string[] = [];
  const { grade, label } = getGradeInfo(finalScore);

  parts.push(`V-Score ${finalScore}점 (${grade}등급: ${label}).`);

  // 가장 위험한 소스 설명
  const weakest = sortedSources[0];
  if (weakest && weakest.score < 70) {
    parts.push(
      `가장 주의가 필요한 영역: ${weakest.name} (${weakest.score}점). ${weakest.details}`
    );
  }

  // 상호작용 설명
  const negativeInteractions = interactions.filter((i) => i.adjustment < 0);
  if (negativeInteractions.length > 0) {
    parts.push(
      `복합 위험 ${negativeInteractions.length}건 감지: ${negativeInteractions.map((i) => i.description).join("; ")}`
    );
  }

  // 데이터 가용성
  const unavailable = sources.filter((s) => !s.dataAvailable);
  if (unavailable.length > 0) {
    parts.push(
      `※ ${unavailable.map((s) => s.name).join(", ")} 데이터 미확보 — 추가 자료 확보 시 정확도 향상 가능.`
    );
  }

  return {
    ruleBasedSummary: parts.join(" "),
    naturalLanguage: "", // LLM 보강 레이어에서 채움
    topRiskFactors,
  };
}

// ─── 메인 함수: V-Score 산출 ───

export interface VScoreInput {
  riskScore?: RiskScore;
  jeonseRatio?: number;
  prediction?: PredictionResult;
  priceConfidence?: number;
  contractResult?: ContractAnalysisResult;
  creditScore?: number;
  isMultiHomeOwner?: boolean;
  isCorporate?: boolean;
  fraudRisk?: FraudRiskResult;
  regionFraudRate?: number;
  auctionRate?: number;
  compositeReliability?: number;
}

/**
 * V-Score 통합 위험도 점수 산출
 *
 * 특허 청구항 핵심:
 * (a) 5대 이질적 데이터 소스를 개별 정량화
 * (b) 학습된 가중치 벡터로 가중합산
 * (c) 소스 간 비선형 상호작용 보정
 * (d) 규칙기반 설명 트리 + LLM 보강 하이브리드 설명 생성
 */
export function calculateVScore(input: VScoreInput): VScoreResult {
  // Step 1: 개별 소스 점수 산출
  const registryResult = calculateRegistryScore(input.riskScore);
  const priceResult = calculatePriceScore(
    input.jeonseRatio,
    input.prediction,
    input.priceConfidence,
  );
  const contractResult = calculateContractScore(input.contractResult);
  const landlordResult = calculateLandlordScore(
    input.riskScore,
    input.creditScore,
    input.isMultiHomeOwner,
    input.isCorporate,
  );
  const regionResult = calculateRegionScore(
    input.fraudRisk,
    input.regionFraudRate,
    input.auctionRate,
  );

  // Step 2: 가중 합산
  const sourceMap: Array<{
    id: keyof typeof SOURCE_WEIGHTS;
    name: string;
    result: { score: number; available: boolean; details: string };
  }> = [
    { id: "registry", name: "등기 권리관계", result: registryResult },
    { id: "price", name: "전세가율/시세", result: priceResult },
    { id: "contract", name: "계약서 위험도", result: contractResult },
    { id: "landlord", name: "임대인 위험지표", result: landlordResult },
    { id: "region", name: "지역 위험도", result: regionResult },
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  const scoreMap = new Map<string, number>();

  const sources: VScoreSource[] = sourceMap.map(({ id, name, result }) => {
    const weight = SOURCE_WEIGHTS[id];
    const weightedScore = result.score * weight;
    weightedSum += weightedScore;
    totalWeight += weight;
    scoreMap.set(id, result.score);

    return {
      id,
      name,
      score: result.score,
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      contribution: 0, // 후처리
      dataAvailable: result.available,
      details: result.details,
    };
  });

  // Step 3: 기본 V-Score (가중 합산)
  let baseScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 50;

  // Step 4: 상호작용 보정 (비선형)
  const interactions = calculateInteractions(scoreMap);
  const interactionAdjustment = interactions.reduce(
    (sum, i) => sum + i.adjustment,
    0
  );
  const adjustedScore = Math.max(0, Math.min(100, baseScore + interactionAdjustment));

  // Step 5: 신뢰도 보정
  const confidenceLevel = input.compositeReliability ?? 0.7;
  // 신뢰도가 낮으면 점수를 중간값(50)에 수렴시킴
  const finalScore = Math.round(
    adjustedScore * confidenceLevel + 50 * (1 - confidenceLevel)
  );

  // Step 6: 기여도 계산 (%)
  const totalAbsContribution = sources.reduce(
    (sum, s) => sum + Math.abs(100 - s.score) * s.weight,
    0
  );
  for (const source of sources) {
    source.contribution =
      totalAbsContribution > 0
        ? Math.round(
            ((Math.abs(100 - source.score) * source.weight) /
              totalAbsContribution) *
              100
          )
        : 20;
  }

  // Step 7: 등급 및 설명 생성
  const { grade, label } = getGradeInfo(finalScore);
  const explanation = generateRuleBasedExplanation(
    sources,
    interactions,
    finalScore,
  );

  return {
    score: finalScore,
    grade,
    gradeLabel: label,
    sources,
    interactions,
    explanation,
    metadata: {
      version: "1.0.0",
      calculatedAt: new Date().toISOString(),
      confidenceLevel,
      algorithmId: "VESTRA-VSCORE-v1.0.0",
    },
  };
}
