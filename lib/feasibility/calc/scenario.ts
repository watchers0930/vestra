/**
 * 시나리오 엔진 (Scenario Engine)
 *
 * SCR 표47~48: 분양률 시나리오별 사업수지 비교
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/scenario
 */

import type { BusinessIncomeResult, BusinessIncomeInput } from "./business-income";
import { calculateBusinessIncome } from "./business-income";

// ─── 입력 타입 ───

/** 시나리오 정의 */
export interface ScenarioDefinition {
  name: string;                // "시나리오 1", "시나리오 2" 등
  apartmentSaleRate: number;   // 아파트 분양률 (0~1, 예: 0.95)
  officetelSaleRate: number;   // 오피스텔 분양률 (예: 0.50)
  commercialSaleRate: number;  // 상가 분양률 (예: 0.50)
}

/** 시나리오 분석 입력값 */
export interface ScenarioInput {
  baseIncome: BusinessIncomeResult;  // 차주안 (분양률 100%)
  baseInput: BusinessIncomeInput;    // 원본 입력값 (재계산용)
  scenarios: ScenarioDefinition[];
}

// ─── 출력 타입 ───

/** 시나리오별 조건 비교 */
export interface ScenarioCondition {
  type: string;                   // "아파트 분양률" 등
  base: number;                   // 차주안 값 (%)
  values: Record<string, number>; // 시나리오명 → 값 (%)
}

/** 시나리오별 사업수지 추정 */
export interface ScenarioProjection {
  name: string;
  revenue: Record<string, number>;  // 항목별 수입
  totalRevenue: number;
  totalCost: number;
  profitBeforeTax: number;
  profitRate: number;               // (%)
}

/** 시나리오 분석 결과 */
export interface ScenarioResult {
  conditions: ScenarioCondition[];
  projections: ScenarioProjection[];
}

// ─── 메인 계산 함수 ───

/**
 * 시나리오별 사업수지를 비교 분석합니다 (SCR 표47~48)
 *
 * - 차주안(base)은 분양률 100%
 * - 각 시나리오에서 시설유형별 분양률을 적용하여 수입을 조정
 * - 비용(사업비)은 모든 시나리오에서 동일하다고 가정
 * - 발코니확장비는 아파트 분양률에 연동
 * - 중도금이자/VAT는 전체 수입 비례로 조정
 */
export function calculateScenarios(input: ScenarioInput): ScenarioResult {
  const { baseIncome, baseInput, scenarios } = input;

  // 조건 비교 테이블 생성
  const conditions: ScenarioCondition[] = [
    {
      type: "아파트 분양률",
      base: 100,
      values: Object.fromEntries(
        scenarios.map((s) => [s.name, s.apartmentSaleRate * 100])
      ),
    },
    {
      type: "오피스텔 분양률",
      base: 100,
      values: Object.fromEntries(
        scenarios.map((s) => [s.name, s.officetelSaleRate * 100])
      ),
    },
    {
      type: "상가 분양률",
      base: 100,
      values: Object.fromEntries(
        scenarios.map((s) => [s.name, s.commercialSaleRate * 100])
      ),
    },
  ];

  // 차주안 projection
  const baseProjection: ScenarioProjection = {
    name: "차주안",
    revenue: {
      아파트: baseInput.revenueApartment,
      오피스텔: baseInput.revenueOfficetel,
      발코니확장비: baseInput.revenueBalcony,
      상가: baseInput.revenueCommercial,
      중도금이자: baseInput.revenueInterimInterest,
      VAT: baseInput.revenueVat,
    },
    totalRevenue: baseIncome.totalRevenue,
    totalCost: baseIncome.totalCost,
    profitBeforeTax: baseIncome.profitBeforeTax,
    profitRate: baseIncome.profitRate,
  };

  // 시나리오별 projection 생성
  const scenarioProjections: ScenarioProjection[] = scenarios.map((scenario) => {
    // 시설별 수입 조정
    const adjApartment = baseInput.revenueApartment * scenario.apartmentSaleRate;
    const adjOfficetel = baseInput.revenueOfficetel * scenario.officetelSaleRate;
    const adjBalcony = baseInput.revenueBalcony * scenario.apartmentSaleRate; // 아파트 연동
    const adjCommercial = baseInput.revenueCommercial * scenario.commercialSaleRate;

    // 중도금이자·VAT는 주요 수입 비례로 조정
    const baseMainRevenue =
      baseInput.revenueApartment +
      baseInput.revenueOfficetel +
      baseInput.revenueBalcony +
      baseInput.revenueCommercial;

    const adjMainRevenue = adjApartment + adjOfficetel + adjBalcony + adjCommercial;
    const revenueRatio = baseMainRevenue !== 0 ? adjMainRevenue / baseMainRevenue : 0;

    const adjInterimInterest = baseInput.revenueInterimInterest * revenueRatio;
    const adjVat = baseInput.revenueVat * revenueRatio;

    const totalRevenue =
      adjApartment + adjOfficetel + adjBalcony + adjCommercial +
      adjInterimInterest + adjVat;

    // 비용은 동일
    const totalCost = baseIncome.totalCost;
    const profitBeforeTax = totalRevenue - totalCost;
    const profitRate = totalRevenue !== 0
      ? Math.round((profitBeforeTax / totalRevenue) * 10000) / 100
      : 0;

    return {
      name: scenario.name,
      revenue: {
        아파트: Math.round(adjApartment),
        오피스텔: Math.round(adjOfficetel),
        발코니확장비: Math.round(adjBalcony),
        상가: Math.round(adjCommercial),
        중도금이자: Math.round(adjInterimInterest),
        VAT: Math.round(adjVat),
      },
      totalRevenue: Math.round(totalRevenue),
      totalCost,
      profitBeforeTax: Math.round(profitBeforeTax),
      profitRate,
    };
  });

  return {
    conditions,
    projections: [baseProjection, ...scenarioProjections],
  };
}
