/**
 * VESTRA SCR 사업성 보고서 — 계산 엔진 배럴 export
 * ────────────────────────────────────────────────────
 * 모든 계산 엔진을 하나로 모아 export.
 *
 * 사용:
 *   import { calculateBep, calculateBusinessIncome } from "@/lib/feasibility/calc";
 */

// ─── BEP 분양률 계산기 ───
export { calculateBep } from "./bep";
export type { BepInput, BepTriple, BepResult } from "./bep";

// ─── 사업수지 계산기 ───
export { calculateBusinessIncome, formatNegative } from "./business-income";
export type {
  BusinessIncomeInput,
  BreakdownRow,
  BusinessIncomeResult,
} from "./business-income";

// ─── DSCR 계산기 ───
export { calculateDscr, calculateDscrAtSaleRate } from "./dscr";
export type { DscrInput, DscrResult } from "./dscr";

// ─── 월별 자금수지 생성기 ───
export { generateMonthlyCashflow } from "./monthly-cashflow";
export type {
  ScheduleEntry,
  MonthlyCashflowInput,
  MonthlyRow,
  MonthlyCashflowResult,
} from "./monthly-cashflow";

// ─── 시세 예측 엔진 ───
export { forecastPrice } from "./price-forecast";
export type {
  NearbyCase,
  RegionalPriceIndex,
  PriceForecastInput,
  ReconstructionAnalysis,
  PriceForecastResult,
} from "./price-forecast";

// ─── 시나리오 엔진 ───
export { calculateScenarios } from "./scenario";
export type {
  ScenarioDefinition,
  ScenarioInput,
  ScenarioCondition,
  ScenarioProjection,
  ScenarioResult,
} from "./scenario";

// ─── 민감도 분석 엔진 ───
export { analyzeSensitivity, analyzeSingleVariableSensitivity } from "./sensitivity";
export type {
  SensitivityScenario,
  SensitivityInput,
  SensitivityRow,
  SensitivityResult,
  SingleVariableSensitivityInput,
  SingleVariableSensitivityRow,
} from "./sensitivity";
