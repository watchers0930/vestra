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

import type { RiskScore } from "./risk-scoring";
import type { VScoreResult, VScoreSource, FraudRiskResult } from "./patent-types";
import type { ContractAnalysisResult } from "./contract-analyzer";
import type { PredictionResult } from "./prediction-engine";
import {
  calculateRegistryScore,
  calculatePriceScore,
  calculateContractScore,
  calculateLandlordScore,
  calculateRegionScore,
  calculateInteractions,
  generateRuleBasedExplanation,
  getGradeInfo,
} from "./v-score/source-scorers";
import type { SourceKey } from "./v-score/source-scorers";

// ─── re-export (기존 import 경로 유지) ───

export {
  calculateRegistryScore,
  calculatePriceScore,
  calculateContractScore,
  calculateLandlordScore,
  calculateRegionScore,
  calculateInteractions,
  generateRuleBasedExplanation,
  getGradeInfo,
} from "./v-score/source-scorers";

export type { SourceKey } from "./v-score/source-scorers";

// ─── 가중치 벡터 (특허 청구항 핵심) ───

const SOURCE_WEIGHTS: Record<SourceKey, number> = {
  registry: 0.30,
  price: 0.25,
  contract: 0.20,
  landlord: 0.15,
  region: 0.10,
};

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
    id: SourceKey;
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
      contribution: 0,
      dataAvailable: result.available,
      details: result.details,
    };
  });

  // Step 3: 기본 V-Score (가중 합산)
  const baseScore = totalWeight > 0
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
