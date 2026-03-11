/**
 * VESTRA 크로스 기능 교차 분석
 * ─────────────────────────────
 * 특허 핵심: 6가지 교차 분석 규칙을 통한 기능 간 데이터 연계.
 * 단순 병렬 분석이 아닌 상호 참조 피드백 루프.
 */

import type { RiskScore } from "./risk-scoring";
import type { PredictionResult } from "./prediction-engine";
import type { ContractAnalysisResult } from "./contract-analyzer";
import type { CrossAnalysisResult, CrossAnalysisLink } from "./patent-types";

// ─── 교차 분석 규칙 정의 ───

const CROSS_ANALYSIS_LINKS: CrossAnalysisLink[] = [
  {
    id: "registry_to_tax",
    from: "registry",
    to: "tax",
    dataFlow: "소유권 변동 이력, 근저당 설정 정보",
    triggerCondition: "소유권 이전 이력 존재",
    description: "소유권이전 이력 → 양도세 자동 계산",
  },
  {
    id: "price_to_jeonse",
    from: "price",
    to: "jeonse",
    dataFlow: "시세 하락 예측값",
    triggerCondition: "시세 하락 예측 5% 이상",
    description: "시세 하락 예측 시 깡투자 위험도 상향",
  },
  {
    id: "contract_to_registry",
    from: "contract",
    to: "registry",
    dataFlow: "계약서 특약사항",
    triggerCondition: "특약사항 존재",
    description: "특약사항 ↔ 등기부 교차 검증",
  },
  {
    id: "jeonse_to_price",
    from: "jeonse",
    to: "price",
    dataFlow: "전세가율 변동",
    triggerCondition: "전세가율 70% 이상",
    description: "전세가율 변동 → 시세예측 피드백",
  },
  {
    id: "tax_to_assistant",
    from: "tax",
    to: "assistant",
    dataFlow: "절세 전략 결과",
    triggerCondition: "세금 계산 완료",
    description: "절세 전략 → 맞춤형 상담 컨텍스트",
  },
  {
    id: "vscore_to_all",
    from: "vscore",
    to: "all",
    dataFlow: "위험도 변동",
    triggerCondition: "V-Score 5점 이상 변동",
    description: "위험도 변동 시 관련 분석 재계산",
  },
];

// ─── 교차 분석 입력 타입 ───

export interface CrossAnalysisInput {
  riskScore?: RiskScore;
  prediction?: PredictionResult;
  contractResult?: ContractAnalysisResult;
  jeonseRatio?: number;
  estimatedPrice?: number;
  jeonsePrice?: number;
  vScoreChange?: number; // 이전 대비 V-Score 변동폭
}

// ─── 개별 교차 분석 규칙 실행 ───

/**
 * 규칙 1: 권리분석 → 세무
 * 소유권 이전 이력에서 양도세 관련 정보 추출
 */
function evaluateRegistryToTax(
  riskScore?: RiskScore,
): { triggered: boolean; result?: string; impact?: string } {
  if (!riskScore) return { triggered: false };

  // 빈번한 소유권 이전 패턴 감지
  const transferPattern = riskScore.temporalPatterns?.patterns.find(
    (p) => p.patternType === "rapid_transfer"
  );

  if (transferPattern) {
    return {
      triggered: true,
      result: `소유권 이전 ${transferPattern.evidence.length}건 감지 → 양도세 다주택 중과 가능성`,
      impact: "양도세 시뮬레이션에서 다주택자 중과세율 적용 필요",
    };
  }

  return { triggered: false };
}

/**
 * 규칙 2: 시세전망 → 전세보호
 * 시세 하락 예측 시 깡투자 위험 경고
 */
function evaluatePriceToJeonse(
  prediction?: PredictionResult,
  jeonseRatio?: number,
): { triggered: boolean; result?: string; impact?: string } {
  if (!prediction || !jeonseRatio) return { triggered: false };

  const pessimistic1y = prediction.predictions.pessimistic["1y"];
  const dropRate = ((prediction.currentPrice - pessimistic1y) / prediction.currentPrice) * 100;

  if (dropRate > 5 && jeonseRatio > 70) {
    return {
      triggered: true,
      result: `시세 ${dropRate.toFixed(1)}% 하락 가능 + 전세가율 ${jeonseRatio.toFixed(1)}% → 깡통전세 위험`,
      impact: "전세보증금반환보증 가입 강력 권고, 보증금 하향 협상 필요",
    };
  }

  return { triggered: false };
}

/**
 * 규칙 3: 계약서 → 권리분석
 * 특약사항과 등기부 교차 검증
 */
function evaluateContractToRegistry(
  contractResult?: ContractAnalysisResult,
  riskScore?: RiskScore,
): { triggered: boolean; result?: string; impact?: string } {
  if (!contractResult || !riskScore) return { triggered: false };

  const riskClauses = contractResult.clauses.filter(
    (c) => c.riskLevel === "high"
  );
  const hasRegistryRisk = riskScore.factors.some(
    (f) => f.severity === "critical" || f.severity === "high"
  );

  if (riskClauses.length > 0 && hasRegistryRisk) {
    return {
      triggered: true,
      result: `계약서 위험조항 ${riskClauses.length}건 + 등기 고위험 요소 동시 존재 → 교차검증 필요`,
      impact: "법률 전문가 검토 필수, 계약 체결 전 위험요소 해소 확인",
    };
  }

  return { triggered: false };
}

/**
 * 규칙 4: 전세보호 → 시세전망
 * 높은 전세가율이 시세에 미치는 영향
 */
function evaluateJeonseToPrice(
  jeonseRatio?: number,
): { triggered: boolean; result?: string; impact?: string } {
  if (!jeonseRatio || jeonseRatio <= 70) return { triggered: false };

  return {
    triggered: true,
    result: `전세가율 ${jeonseRatio.toFixed(1)}% → 시세 하방 압력 가능성`,
    impact: jeonseRatio > 85
      ? "매매가 대비 전세가 과다 → 역전세 우려, 시세 하락 시 보증금 회수 리스크"
      : "전세가율 경계 수준 → 시세 전망 시 하방 리스크 반영",
  };
}

/**
 * 규칙 6: V-Score → 전체
 * 유의미한 위험도 변동 감지
 */
function evaluateVScoreToAll(
  vScoreChange?: number,
): { triggered: boolean; result?: string; impact?: string } {
  if (vScoreChange === undefined || Math.abs(vScoreChange) < 5) {
    return { triggered: false };
  }

  const direction = vScoreChange < 0 ? "하락" : "상승";

  return {
    triggered: true,
    result: `V-Score ${Math.abs(vScoreChange)}점 ${direction} → 연관 분석 재계산 필요`,
    impact: vScoreChange < -10
      ? "긴급: 위험도 대폭 상승, 모든 관련 분석 결과 재검토 권고"
      : `${direction} 추세 반영하여 연관 분석 업데이트`,
  };
}

// ─── 메인 함수: 교차 분석 실행 ───

/**
 * 전체 교차 분석 규칙 평가
 *
 * @returns 트리거된 교차 분석 결과 + 캐스케이드 업데이트 수
 */
export function evaluateCrossAnalysis(
  input: CrossAnalysisInput,
): CrossAnalysisResult {
  const results: CrossAnalysisResult["links"] = [];

  // 규칙 1: 권리분석 → 세무
  const r1 = evaluateRegistryToTax(input.riskScore);
  results.push({
    linkId: "registry_to_tax",
    from: "registry",
    to: "tax",
    triggered: r1.triggered,
    result: r1.result,
    impact: r1.impact,
  });

  // 규칙 2: 시세전망 → 전세보호
  const r2 = evaluatePriceToJeonse(input.prediction, input.jeonseRatio);
  results.push({
    linkId: "price_to_jeonse",
    from: "price",
    to: "jeonse",
    triggered: r2.triggered,
    result: r2.result,
    impact: r2.impact,
  });

  // 규칙 3: 계약서 → 권리분석
  const r3 = evaluateContractToRegistry(
    input.contractResult,
    input.riskScore,
  );
  results.push({
    linkId: "contract_to_registry",
    from: "contract",
    to: "registry",
    triggered: r3.triggered,
    result: r3.result,
    impact: r3.impact,
  });

  // 규칙 4: 전세보호 → 시세전망
  const r4 = evaluateJeonseToPrice(input.jeonseRatio);
  results.push({
    linkId: "jeonse_to_price",
    from: "jeonse",
    to: "price",
    triggered: r4.triggered,
    result: r4.result,
    impact: r4.impact,
  });

  // 규칙 5: 세무 → AI어시스턴트 (컨텍스트 전달만)
  results.push({
    linkId: "tax_to_assistant",
    from: "tax",
    to: "assistant",
    triggered: false, // 별도 세무 결과가 필요
  });

  // 규칙 6: V-Score → 전체
  const r6 = evaluateVScoreToAll(input.vScoreChange);
  results.push({
    linkId: "vscore_to_all",
    from: "vscore",
    to: "all",
    triggered: r6.triggered,
    result: r6.result,
    impact: r6.impact,
  });

  const triggeredCount = results.filter((r) => r.triggered).length;

  return {
    links: results,
    cascadeUpdates: triggeredCount,
    totalLinksEvaluated: results.length,
  };
}

/**
 * 교차 분석 링크 정의 조회
 */
export function getCrossAnalysisLinks(): CrossAnalysisLink[] {
  return CROSS_ANALYSIS_LINKS;
}
