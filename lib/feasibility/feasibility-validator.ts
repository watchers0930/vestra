/**
 * 주장-검증 엔진 (Claim-Verification Engine)
 *
 * 업체가 제출한 수치(분양가, 공사비, 분양률 등)를
 * 공공데이터(MOLIT, KICT, REB) 및 벤치마크 DB와 교차 검증합니다.
 *
 * @module lib/feasibility/feasibility-validator
 */

import { fetchComprehensivePrices, type ComprehensivePriceResult } from "@/lib/molit-api";
import { fetchSupplyVolume, type SupplyData } from "@/lib/supply-api";
import {
  getBenchmarkForConstruction,
  getBenchmarkForSaleRate,
  getBenchmarkForPfRate,
  getBenchmarkForProfitRate,
} from "./benchmark-db";
import type {
  ExtractedValue,
  MergedProjectContext,
  VerificationResult,
  BenchmarkValue,
} from "./feasibility-types";
import { CLAIM_LABELS, type ClaimKey } from "./feasibility-types";

// ---------------------------------------------------------------------------
// 외부 데이터 일괄 조회
// ---------------------------------------------------------------------------

export interface ExternalData {
  molit: ComprehensivePriceResult;
  supply: SupplyData | null;
  constructionBenchmark: BenchmarkValue;
  saleRateBenchmark: BenchmarkValue;
  pfRateBenchmark: BenchmarkValue;
  profitRateBenchmark: BenchmarkValue;
}

export async function fetchExternalData(
  context: MergedProjectContext
): Promise<ExternalData> {
  const [molit, supply, constructionBenchmark, saleRateBenchmark, pfRateBenchmark, profitRateBenchmark] =
    await Promise.all([
      fetchComprehensivePrices(context.location.address, 12).catch(
        () => ({ sale: null, rent: null, jeonseRatio: null } as ComprehensivePriceResult)
      ),
      fetchSupplyVolume(context.location.address).catch(() => null),
      getBenchmarkForConstruction(context.purpose),
      getBenchmarkForSaleRate(context.location.address),
      getBenchmarkForPfRate(),
      getBenchmarkForProfitRate(context.purpose),
    ]);

  return {
    molit,
    supply,
    constructionBenchmark,
    saleRateBenchmark,
    pfRateBenchmark,
    profitRateBenchmark,
  };
}

// ---------------------------------------------------------------------------
// 주장-검증 메인
// ---------------------------------------------------------------------------

export function verifyClaims(
  claims: ExtractedValue[],
  externalData: ExternalData
): VerificationResult[] {
  const results: VerificationResult[] = [];

  for (const claim of claims) {
    const verification = matchClaimToBenchmark(claim, externalData);
    if (verification) {
      results.push(verification);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 항목별 벤치마크 매칭
// ---------------------------------------------------------------------------

function matchClaimToBenchmark(
  claim: ExtractedValue,
  data: ExternalData
): VerificationResult | null {
  const label = CLAIM_LABELS[claim.key as ClaimKey] || claim.key;

  switch (claim.key) {
    case "planned_sale_price": {
      // MOLIT 실거래가 대비 검증 (평당 가격으로 변환)
      if (!data.molit.sale) return null;
      const txs = data.molit.sale.transactions || [];
      // 전용면적이 있는 거래만 필터하여 평당가(만원/평) 계산
      const perPyeongPrices = txs
        .filter((t) => t.area > 0)
        .map((t) => t.dealAmount / (t.area / 3.305785) / 10000); // 원→만원, ㎡→평
      if (perPyeongPrices.length === 0) return null;
      const avgPerPyeong = Math.round(perPyeongPrices.reduce((a, b) => a + b, 0) / perPyeongPrices.length);
      const minPerPyeong = Math.round(Math.min(...perPyeongPrices));
      const maxPerPyeong = Math.round(Math.max(...perPyeongPrices));
      return buildResult(claim, label, {
        value: avgPerPyeong,
        source: `MOLIT 실거래가 (${data.molit.sale.period})`,
        sourceType: "molit",
        asOfDate: new Date().toISOString(),
        comparableCount: perPyeongPrices.length,
        range: { min: minPerPyeong, max: maxPerPyeong },
      });
    }

    case "total_construction_cost":
    case "construction_cost_per_pyeong": {
      // KICT 건설공사비지수 대비 검증
      return buildResult(claim, label, data.constructionBenchmark);
    }

    case "expected_sale_rate": {
      // 지역별 분양률 벤치마크 대비 검증
      return buildResult(claim, label, data.saleRateBenchmark);
    }

    case "pf_interest_rate": {
      // PF 금리 밴드 대비 검증
      return buildResult(claim, label, data.pfRateBenchmark);
    }

    case "expected_profit_rate": {
      // 수익률 벤치마크 대비 검증
      return buildResult(claim, label, data.profitRateBenchmark);
    }

    case "total_floor_area":
    case "total_land_area":
    case "floor_area_ratio":
    case "building_coverage":
    case "total_units":
      // 규모 관련 항목은 검증 없이 정보로만 기록
      return null;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 검증 결과 빌더
// ---------------------------------------------------------------------------

function buildResult(
  claim: ExtractedValue,
  label: string,
  benchmark: BenchmarkValue & { comparableCount?: number }
): VerificationResult {
  const deviation = benchmark.value > 0
    ? (claim.value - benchmark.value) / benchmark.value
    : 0;

  return {
    claimKey: claim.key,
    claimLabel: label,
    claimValue: claim.value,
    claimUnit: claim.unit,
    benchmark: {
      value: benchmark.value,
      source: benchmark.source,
      sourceType: benchmark.sourceType,
      asOfDate: benchmark.asOfDate,
      comparableCount: benchmark.comparableCount,
      range: benchmark.range,
    },
    deviation,
    deviationPercent: deviation * 100,
  };
}
