/**
 * VESTRA SCR 사업성 보고서 — 외부 API 모듈 배럴 export
 * ────────────────────────────────────────────────────
 * 모든 외부 API 클라이언트를 하나로 모아 export.
 *
 * 사용:
 *   import { fetchPopulationTrends, fetchFinancials } from "@/lib/feasibility/api";
 */

// ─── 통계청 KOSIS API ───
export {
  fetchPopulationTrends,
  fetchAgeGroupPopulation,
  fetchIndustryData,
  fetchHousingSupply,
} from "./kosis-api";

export type {
  PopulationTrend,
  AgeGroupPopulation,
  IndustryData,
  HousingSupply,
  KOSISPopulationResult,
  KOSISIndustryResult,
  KOSISHousingResult,
} from "./kosis-api";

// ─── DART 전자공시 API ───
export {
  fetchCorpInfo,
  fetchFinancials,
  searchCorpCode,
} from "./dart-api";

export type {
  DARTCorpInfo,
  IncomeStatement,
  BalanceSheet,
  DARTFinancialResult,
} from "./dart-api";

// ─── 한국부동산원 REPS API ───
export {
  fetchSalePriceIndex,
  fetchRentPriceIndex,
  extractRegionCode,
} from "./reps-api";

export type {
  PriceIndex,
  REPSSalePriceResult,
  REPSRentPriceResult,
} from "./reps-api";

// ─── 행안부 주민등록 API ───
export {
  fetchMOISPopulation,
  fetchMOISAgePopulation,
  extractAdminCode,
} from "./mois-api";

export type {
  MOISPopulation,
  MOISAgeGroup,
  MOISPopulationResult,
  MOISAgeResult,
} from "./mois-api";
