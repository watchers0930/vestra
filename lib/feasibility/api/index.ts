/**
 * VESTRA SCR 사업성 보고서 — 외부 API 모듈 배럴 export
 * ────────────────────────────────────────────────────
 * 모든 외부 API 클라이언트를 하나로 모아 export.
 *
 * 사용:
 *   import { fetchPopulationTrends, fetchFinancials } from "@/lib/feasibility/api";
 */

// ─── 공통 유틸리티 ───
export { fetchWithTimeout } from "./api-utils";
export {
  REGION_CODE_MAP,
  ADMIN_CODE_MAP,
  extractRegionFromAddress,
} from "./region-codes";

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
