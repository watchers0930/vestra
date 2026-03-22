/**
 * VESTRA 캐스케이드 재계산기 등록 모듈
 * ───────────────────────────────────────
 * CascadeEngine에 각 노드별 재계산 함수를 등록.
 * 하나의 분석이 변경되면 의존 노드들이 자동 재계산됨.
 */

import { CascadeEngine } from "./cascade-engine";
import { calculateRiskScore } from "./risk-scoring";
import { calculateVScore, type VScoreInput } from "./v-score";
import { evaluateCrossAnalysis, type CrossAnalysisInput } from "./cross-analysis";

import type { ParsedRegistry } from "./registry-parser";
import type { RiskScore } from "./risk-scoring";
import type { ContractAnalysisResult } from "./contract-analyzer";
import type { PredictionResult } from "./prediction-engine";
import type { FraudRiskResult } from "./patent-types";

/**
 * 캐스케이드 컨텍스트 타입
 * 각 노드의 현재 분석 데이터를 보관
 */
export interface CascadeContext {
  // 원시 입력 데이터
  parsed?: ParsedRegistry;
  estimatedPrice?: number;
  jeonseRatio?: number;
  jeonsePrice?: number;

  // 각 노드별 분석 결과
  registry?: RiskScore;
  contract?: ContractAnalysisResult;
  price?: PredictionResult;
  fraud?: FraudRiskResult;
  vscore?: number;
  cross?: number;
  tax?: unknown;
  jeonse?: unknown;
}

/**
 * 모든 재계산기를 CascadeEngine에 등록
 *
 * @param engine - CascadeEngine 인스턴스
 * @param ctx - 현재 분석 데이터가 담긴 컨텍스트 (참조 유지됨)
 */
export function registerAllRecalculators(
  engine: CascadeEngine,
  ctx: CascadeContext,
): void {
  // registry 노드: 등기부등본 파싱 결과로 RiskScore 재계산
  engine.registerRecalculator("registry", async (_nodeId, context) => {
    const parsed = (context.parsed ?? ctx.parsed) as ParsedRegistry | undefined;
    const estimatedPrice = (context.estimatedPrice ?? ctx.estimatedPrice) as number | undefined;

    if (parsed) {
      const riskScore = calculateRiskScore(parsed, estimatedPrice);
      ctx.registry = riskScore;
      return riskScore;
    }
    return context.registry ?? ctx.registry;
  });

  // vscore 노드: V-Score 통합 위험도 재계산
  engine.registerRecalculator("vscore", async (_nodeId, context) => {
    const riskScore = (context.registry ?? ctx.registry) as RiskScore | undefined;
    const contractResult = (context.contract ?? ctx.contract) as ContractAnalysisResult | undefined;
    const prediction = (context.price ?? ctx.price) as PredictionResult | undefined;
    const fraudRisk = (context.fraud ?? ctx.fraud) as FraudRiskResult | undefined;
    const jeonseRatio = (context.jeonseRatio ?? ctx.jeonseRatio) as number | undefined;

    const input: VScoreInput = {
      riskScore,
      contractResult,
      prediction,
      fraudRisk,
      jeonseRatio,
    };

    const result = calculateVScore(input);
    ctx.vscore = result.score;
    return result;
  });

  // cross 노드: 교차 분석 재계산
  engine.registerRecalculator("cross", async (_nodeId, context) => {
    const riskScore = (context.registry ?? ctx.registry) as RiskScore | undefined;
    const contractResult = (context.contract ?? ctx.contract) as ContractAnalysisResult | undefined;
    const prediction = (context.price ?? ctx.price) as PredictionResult | undefined;
    const jeonseRatio = (context.jeonseRatio ?? ctx.jeonseRatio) as number | undefined;
    const estimatedPrice = (context.estimatedPrice ?? ctx.estimatedPrice) as number | undefined;
    const jeonsePrice = (context.jeonsePrice ?? ctx.jeonsePrice) as number | undefined;

    const input: CrossAnalysisInput = {
      riskScore,
      contractResult,
      prediction,
      jeonseRatio,
      estimatedPrice,
      jeonsePrice,
    };

    const result = evaluateCrossAnalysis(input);
    ctx.cross = result.cascadeUpdates;
    return result;
  });

  // fraud 노드: 사기위험은 외부 API 호출 필요하므로 컨텍스트 값 유지
  engine.registerRecalculator("fraud", async (_nodeId, context) => {
    return context.fraud ?? ctx.fraud;
  });

  // tax 노드: 세무 시뮬레이션은 별도 입력 필요하므로 컨텍스트 값 유지
  engine.registerRecalculator("tax", async (_nodeId, context) => {
    return context.tax ?? ctx.tax;
  });

  // jeonse 노드: 전세보호 분석은 컨텍스트 값 유지
  engine.registerRecalculator("jeonse", async (_nodeId, context) => {
    return context.jeonse ?? ctx.jeonse;
  });

  // price 노드: 시세전망은 외부 데이터 필요하므로 컨텍스트 값 유지
  engine.registerRecalculator("price", async (_nodeId, context) => {
    return context.price ?? ctx.price;
  });

  // contract 노드: 계약서 분석은 문서 입력 필요하므로 컨텍스트 값 유지
  engine.registerRecalculator("contract", async (_nodeId, context) => {
    return context.contract ?? ctx.contract;
  });
}
