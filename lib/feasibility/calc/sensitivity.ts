/**
 * 민감도 분석 엔진 (Sensitivity Analysis Engine)
 *
 * SCR 표49: 시나리오별 민감도 분석
 * 분양률 변동에 따른 사업성 지표 변화를 분석합니다.
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/sensitivity
 */

import { calculateDscr, type DscrResult } from "./dscr";

// ─── 입력 타입 ───

/** 민감도 분석 시나리오 정의 */
export interface SensitivityScenario {
  name: string;               // "차주안", "시나리오1" 등
  saleRate: number;           // 적용 분양률 (0~1, 예: 1.0, 0.95, 0.90)
}

/** 민감도 분석 입력값 */
export interface SensitivityInput {
  // 기본 사업 데이터
  baseRevenue: number;        // 100% 분양 기준 총수입
  totalCost: number;          // 사업비 합계 (고정)

  // PF/자본 데이터
  pfTotal: number;            // PF 원금
  pfInterestTotal: number;    // PF 이자 합계
  equity: number;             // 자기자본
  constructionReserve: number; // 공사비 유보

  // 분양가 기준 (미분양재고 산출용)
  totalSalePriceAtFull: number; // 100% 분양시 분양가 총액 (백만원)

  // 시나리오 목록
  scenarios: SensitivityScenario[];
}

// ─── 출력 타입 ───

/** 시나리오별 민감도 결과 행 */
export interface SensitivityRow {
  name: string;                  // 시나리오명
  maturitySaleRate: number;      // 만기시점 분양률 (총수입 기준, %)
  totalRevenue: number;          // 분양수입 (백만원)
  profitBeforeTax: number;       // 세전이익 (백만원)
  profitRate: number;            // 이익률 (%)
  cumulativeDscr: number;        // 누적 DSCR
  creditEnhancement: number;     // 신용보강 금액 (백만원)
  unsoldInventory: number;       // 미분양재고 (분양가 기준, 백만원)
}

/** 민감도 분석 결과 */
export interface SensitivityResult {
  scenarios: SensitivityRow[];
}

// ─── 메인 계산 함수 ───

/**
 * 시나리오별 민감도를 분석합니다 (SCR 표49)
 *
 * 각 시나리오(분양률)에 대해:
 * - 수입 = 기본수입 × 분양률
 * - 이익 = 수입 - 사업비
 * - DSCR = (수입 + 자기자본 + 유보) / PF 원리금
 * - 미분양재고 = (1 - 분양률) × 분양가 총액
 */
export function analyzeSensitivity(input: SensitivityInput): SensitivityResult {
  const {
    baseRevenue,
    totalCost,
    pfTotal,
    pfInterestTotal,
    equity,
    constructionReserve,
    totalSalePriceAtFull,
    scenarios,
  } = input;

  const rows: SensitivityRow[] = scenarios.map((scenario) => {
    const { name, saleRate } = scenario;

    // 수입 계산
    const totalRevenue = Math.round(baseRevenue * saleRate);

    // 이익 계산
    const profitBeforeTax = totalRevenue - totalCost;
    const profitRate = totalRevenue !== 0
      ? Math.round((profitBeforeTax / totalRevenue) * 10000) / 100
      : 0;

    // DSCR 계산
    const dscrResult: DscrResult = calculateDscr({
      totalRevenue,
      pfTotal,
      pfInterestTotal,
      equity,
      constructionReserve,
    });

    // 미분양재고 (분양가 기준)
    const unsoldInventory = Math.round(totalSalePriceAtFull * (1 - saleRate));

    // 만기시점 분양률 (%)
    const maturitySaleRate = Math.round(saleRate * 10000) / 100;

    return {
      name,
      maturitySaleRate,
      totalRevenue,
      profitBeforeTax,
      profitRate,
      cumulativeDscr: dscrResult.cumulativeDscr,
      creditEnhancement: dscrResult.creditEnhancement,
      unsoldInventory,
    };
  });

  return { scenarios: rows };
}

// ─── 변수별 민감도 분석 (단일 변수 변동) ───

/** 단일 변수 민감도 입력 */
export interface SingleVariableSensitivityInput {
  variableName: string;          // "분양가", "분양률", "공사비" 등
  baseValue: number;             // 기준값
  changePercents: number[];      // 변동률 목록 (%, 예: [-10, -5, 0, 5, 10])
  baseRevenue: number;           // 기준 총수입
  baseCost: number;              // 기준 총비용
  isRevenueSide: boolean;        // true면 수입항목, false면 비용항목
}

/** 단일 변수 민감도 결과 행 */
export interface SingleVariableSensitivityRow {
  variable: string;              // 변수명
  changePercent: number;         // 변동률 (%)
  adjustedValue: number;         // 조정 후 값
  profitImpact: number;          // 이익 변동 (백만원)
  profitRateImpact: number;      // 이익률 변동 (%p)
}

/**
 * 단일 변수 변동에 따른 민감도를 분석합니다
 */
export function analyzeSingleVariableSensitivity(
  input: SingleVariableSensitivityInput
): SingleVariableSensitivityRow[] {
  const { variableName, baseValue, changePercents, baseRevenue, baseCost, isRevenueSide } = input;

  const baseProfit = baseRevenue - baseCost;
  const baseProfitRate = baseRevenue !== 0 ? (baseProfit / baseRevenue) * 100 : 0;

  return changePercents.map((changePercent) => {
    const adjustedValue = baseValue * (1 + changePercent / 100);
    const delta = adjustedValue - baseValue;

    let newRevenue: number;
    let newCost: number;

    if (isRevenueSide) {
      // 수입 항목 변동: 수입 증감
      newRevenue = baseRevenue + delta;
      newCost = baseCost;
    } else {
      // 비용 항목 변동: 비용 증감
      newRevenue = baseRevenue;
      newCost = baseCost + delta;
    }

    const newProfit = newRevenue - newCost;
    const newProfitRate = newRevenue !== 0 ? (newProfit / newRevenue) * 100 : 0;

    return {
      variable: variableName,
      changePercent,
      adjustedValue: Math.round(adjustedValue),
      profitImpact: Math.round(newProfit - baseProfit),
      profitRateImpact: Math.round((newProfitRate - baseProfitRate) * 100) / 100,
    };
  });
}
