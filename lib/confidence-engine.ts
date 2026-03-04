/**
 * VESTRA 신뢰도 전파 프레임워크 (Confidence Propagation Engine)
 * ─────────────────────────────────────────────────────────────
 * 다단계 분석 파이프라인의 각 단계에서 신뢰도를 계산하고,
 * 가중 기하평균으로 복합 신뢰도를 산출하여 분석 결과의 투명한 신뢰 체인을 형성.
 *
 * 특허 핵심: 각 분석 단계의 데이터 품질 지표 → 단계별 신뢰도 점수 →
 *           가중 기하평균 복합 신뢰도 → 병목 단계 자동 식별
 */

import type { ParsedRegistry } from "./registry-parser";
import type { RiskScore } from "./risk-scoring";
import type { ValidationResult } from "./validation-engine";
import type {
  StageConfidence,
  ConfidencePropagationResult,
} from "./patent-types";

// ─── 단계별 가중치 (합=1.0) ───

const STAGE_WEIGHTS: Record<string, number> = {
  parser: 0.25,
  riskScoring: 0.30,
  priceEstimation: 0.25,
  validation: 0.20,
};

// ─── 데이터 품질 등급 판정 ───

function classifyDataQuality(confidence: number): StageConfidence["dataQuality"] {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

// ─── 파서 신뢰도 ───

export function calculateParserConfidence(parsed: ParsedRegistry): StageConfidence {
  const factors: StageConfidence["factors"] = [];

  // 1. 섹션 탐지율: 3개 섹션(표제부, 갑구, 을구) 중 데이터가 있는 비율
  const sectionCount = [
    parsed.title.address ? 1 : 0,
    parsed.gapgu.length > 0 ? 1 : 0,
    parsed.eulgu.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  const sectionDetection = sectionCount / 3;
  factors.push({ name: "섹션탐지율", value: sectionDetection, weight: 0.35 });

  // 2. 필드 완전성: 각 항목의 핵심 필드가 채워진 비율
  const allEntries = [...parsed.gapgu, ...parsed.eulgu];
  if (allEntries.length > 0) {
    const completeness = allEntries.reduce((sum, entry) => {
      let filled = 0;
      let total = 3; // date, purpose, holder
      if (entry.date) filled++;
      if (entry.purpose && entry.purpose !== "기타") filled++;
      if (entry.holder) filled++;
      return sum + filled / total;
    }, 0) / allEntries.length;
    factors.push({ name: "필드완전성", value: completeness, weight: 0.35 });
  } else {
    factors.push({ name: "필드완전성", value: 0, weight: 0.35 });
  }

  // 3. 항목 파싱률: 날짜가 있는 항목의 비율 (파싱 성공 지표)
  const parsedEntries = allEntries.filter((e) => e.date && e.date.length >= 8);
  const parsability = allEntries.length > 0
    ? parsedEntries.length / allEntries.length
    : 0;
  factors.push({ name: "항목파싱률", value: parsability, weight: 0.30 });

  const confidence = factors.reduce((sum, f) => sum + f.value * f.weight, 0);

  return {
    stage: "parser",
    confidence: Math.max(0, Math.min(1, confidence)),
    factors,
    dataQuality: classifyDataQuality(confidence),
  };
}

// ─── 리스크 스코어링 신뢰도 ───

export function calculateRiskScoringConfidence(
  parsed: ParsedRegistry,
  riskScore: RiskScore,
  estimatedPrice: number,
  validation: ValidationResult,
): StageConfidence {
  const factors: StageConfidence["factors"] = [];

  // 1. 데이터 가용성: 최소 기대 항목 수 대비 실제 파싱 항목
  const expectedMinEntries = 3;
  const totalEntries = parsed.gapgu.length + parsed.eulgu.length;
  const dataAvailability = Math.min(1, totalEntries / expectedMinEntries);
  factors.push({ name: "데이터가용성", value: dataAvailability, weight: 0.30 });

  // 2. 가격 데이터 존재: 추정가가 있으면 근저당비율 등 핵심 계산 가능
  const pricePresence = estimatedPrice > 0 ? 1 : 0.3;
  factors.push({ name: "가격데이터존재", value: pricePresence, weight: 0.35 });

  // 3. 검증 통과율: 검증 엔진의 오류/경고가 적을수록 데이터 품질 높음
  const validationErrorRate = validation.summary.totalChecks > 0
    ? validation.summary.errors / validation.summary.totalChecks
    : 0;
  const validationHealth = 1 - validationErrorRate;
  factors.push({ name: "검증통과율", value: validationHealth, weight: 0.35 });

  const confidence = factors.reduce((sum, f) => sum + f.value * f.weight, 0);

  return {
    stage: "riskScoring",
    confidence: Math.max(0, Math.min(1, confidence)),
    factors,
    dataQuality: classifyDataQuality(confidence),
  };
}

// ─── 가격 추정 신뢰도 ───

export function calculatePriceConfidence(
  priceConfidenceScore: number,
): StageConfidence {
  // 기존 price-estimation.ts의 confidence(0~95)를 0~1로 정규화
  const normalized = Math.min(1, Math.max(0, priceConfidenceScore / 95));

  return {
    stage: "priceEstimation",
    confidence: normalized,
    factors: [
      { name: "비교매물신뢰도", value: normalized, weight: 1.0 },
    ],
    dataQuality: classifyDataQuality(normalized),
  };
}

// ─── 검증 엔진 신뢰도 ───

export function calculateValidationConfidence(
  validation: ValidationResult,
): StageConfidence {
  const factors: StageConfidence["factors"] = [];

  // 검증 점수 (0~100 → 0~1)
  const scoreNormalized = validation.score / 100;
  factors.push({ name: "검증점수", value: scoreNormalized, weight: 0.50 });

  // 오류 없음 여부
  const noErrors = validation.summary.errors === 0 ? 1 : 0;
  factors.push({ name: "오류없음", value: noErrors, weight: 0.30 });

  // 검사 범위 (최소 10개 검사 기대)
  const coverage = Math.min(1, validation.summary.totalChecks / 10);
  factors.push({ name: "검사범위", value: coverage, weight: 0.20 });

  const confidence = factors.reduce((sum, f) => sum + f.value * f.weight, 0);

  return {
    stage: "validation",
    confidence: Math.max(0, Math.min(1, confidence)),
    factors,
    dataQuality: classifyDataQuality(confidence),
  };
}

// ─── 복합 신뢰도 계산 (가중 기하평균) ───

function computeCompositeReliability(stages: StageConfidence[]): number {
  // 가중 기하평균: exp(Σ(w_i × ln(c_i)) / Σw_i)
  // ln(0)을 방지하기 위해 최소값 0.01 적용
  let weightedLogSum = 0;
  let totalWeight = 0;

  for (const stage of stages) {
    const weight = STAGE_WEIGHTS[stage.stage] ?? 0.1;
    const safeConfidence = Math.max(0.01, stage.confidence);
    weightedLogSum += weight * Math.log(safeConfidence);
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.max(0, Math.min(1, Math.exp(weightedLogSum / totalWeight)));
}

// ─── 신뢰 체인 구축 ───

function buildTrustChain(stages: StageConfidence[]): ConfidencePropagationResult["trustChain"] {
  const chain: ConfidencePropagationResult["trustChain"] = [];
  const stageOrder = ["parser", "riskScoring", "priceEstimation", "validation"];

  for (let i = 0; i < stageOrder.length - 1; i++) {
    const from = stages.find((s) => s.stage === stageOrder[i]);
    const to = stages.find((s) => s.stage === stageOrder[i + 1]);
    if (from && to) {
      // 전파된 신뢰도 = 이전 단계 신뢰도 × 현재 단계 신뢰도
      chain.push({
        from: from.stage,
        to: to.stage,
        propagatedConfidence: from.confidence * to.confidence,
      });
    }
  }

  return chain;
}

// ─── 병목 단계 식별 ───

function identifyBottleneck(stages: StageConfidence[]): ConfidencePropagationResult["bottleneck"] {
  if (stages.length === 0) {
    return { stage: "unknown", confidence: 0, reason: "분석 단계 정보 없음" };
  }

  const weakest = stages.reduce((min, s) =>
    s.confidence < min.confidence ? s : min
  );

  const reasons: Record<string, string> = {
    parser: "등기부등본 파싱 품질이 낮습니다. 원문 데이터 형식을 확인하세요.",
    riskScoring: "리스크 스코어링에 필요한 데이터가 부족합니다. 추정 시세 또는 등기 항목을 확인하세요.",
    priceEstimation: "비교매물이 부족하여 가격 추정 신뢰도가 낮습니다.",
    validation: "데이터 검증에서 오류가 발견되었습니다. 파싱 결과를 재확인하세요.",
  };

  return {
    stage: weakest.stage,
    confidence: weakest.confidence,
    reason: reasons[weakest.stage] || "분석 데이터 품질이 낮습니다.",
  };
}

// ─── 메인 함수 ───

/**
 * 다단계 분석 파이프라인의 신뢰도를 전파하고 복합 신뢰도를 산출합니다.
 */
export function propagateConfidence(
  parsed: ParsedRegistry,
  riskScore: RiskScore,
  estimatedPrice: number,
  priceConfidenceScore: number,
  validation: ValidationResult,
): ConfidencePropagationResult {
  const stages: StageConfidence[] = [
    calculateParserConfidence(parsed),
    calculateRiskScoringConfidence(parsed, riskScore, estimatedPrice, validation),
    calculatePriceConfidence(priceConfidenceScore),
    calculateValidationConfidence(validation),
  ];

  const compositeReliability = computeCompositeReliability(stages);
  const trustChain = buildTrustChain(stages);
  const bottleneck = identifyBottleneck(stages);

  return {
    stages,
    compositeReliability,
    trustChain,
    bottleneck,
  };
}
