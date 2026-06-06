/**
 * SCR 보고서 조립 모듈 (Step 4)
 *
 * 외부 API 데이터 + 계산 결과를 합쳐 ScrReportData 구조로 조립.
 *
 * @module lib/feasibility/scr-assembler
 */

import type { ParsedDocument, ExtractedValue } from "./feasibility-types";
import type {
  ScrReportData,
  ScrFrontMatter,
  ScrProjectOverview,
  ScrMetadata,
  ProjectType,
} from "./scr-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import type {
  BusinessIncomeResult,
  BepResult,
  DscrResult,
  MonthlyCashflowResult,
  ScenarioResult,
  SensitivityResult,
  PriceForecastResult,
} from "./calc";
import type {
  KOSISPopulationResult,
  KOSISHousingResult,
  DARTCorpInfo,
  DARTFinancialResult,
  REPSSalePriceResult,
  REPSRentPriceResult,
  MOISPopulationResult,
  MOISAgeResult,
} from "./api";
import type { StaticMarketContext } from "./static-data";
import {
  buildDeveloperAnalysis,
  buildMarketAnalysis,
  buildPriceAdequacy,
  buildRepaymentAnalysis,
  buildAppendices,
} from "./scr-assembler-builders";

// ─── 공유 타입 (orchestrator에서도 사용) ───

export interface ExternalApiData {
  populationTrends: KOSISPopulationResult | null;
  housingSupply: KOSISHousingResult | null;
  corpInfo: DARTCorpInfo | null;
  financials: DARTFinancialResult | null;
  salePriceIndex: REPSSalePriceResult | null;
  rentPriceIndex: REPSRentPriceResult | null;
  moisPopulation: MOISPopulationResult | null;
  moisAge: MOISAgeResult | null;
  staticMarket: StaticMarketContext;
}

export interface CalcResults {
  businessIncome: BusinessIncomeResult;
  bep: BepResult;
  dscr: DscrResult;
  monthlyCashflow: MonthlyCashflowResult;
  scenarios: ScenarioResult;
  sensitivity: SensitivityResult;
  priceForecast: PriceForecastResult;
}

// ─── 유틸 ───

/** 파싱 데이터에서 특정 키의 숫자값 추출 */
export function getClaimValue(
  parsedDocs: ParsedDocument[],
  key: ScrClaimKey
): number {
  for (const doc of parsedDocs) {
    const extracted = doc.extractedData[key];
    if (extracted && typeof extracted.value === "number") {
      return extracted.value;
    }
  }
  return 0;
}

/** 파싱 데이터에서 특정 키의 문자열값 추출 */
export function getClaimString(
  parsedDocs: ParsedDocument[],
  key: ScrClaimKey
): string {
  for (const doc of parsedDocs) {
    const extracted = doc.extractedData[key];
    if (extracted && extracted.context) {
      return extracted.context;
    }
  }
  return "";
}

// ─── 보고서 조립 메인 ───

export function assembleReport(
  parsedDocs: ParsedDocument[],
  mergedData: Record<string, ExtractedValue>,
  apiData: ExternalApiData,
  calcResults: CalcResults,
  projectType: ProjectType,
  address: string,
  district: string,
  developerName: string,
  constructorName: string,
  options: { analyst?: string }
): ScrReportData {
  const val = (key: ScrClaimKey): number => getClaimValue(parsedDocs, key);
  const now = new Date().toISOString();

  // ── 전문부 ──
  const frontMatter: ScrFrontMatter = {
    reportNumber: `SCR-${Date.now().toString(36).toUpperCase()}`,
    projectName: getClaimString(parsedDocs, "building_name") || "미정",
    developer: developerName,
    analyst: options.analyst || "VESTRA AI",
    date: now.slice(0, 10),
    disclaimer:
      "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 유일한 근거로 사용해서는 안 됩니다. " +
      "전문 감정평가사 또는 신용평가사의 검토를 권장합니다.",
  };

  // ── I. 사업 개요 ──
  const projectOverview: ScrProjectOverview = {
    projectSummary: {
      projectName: frontMatter.projectName,
      siteAddress: address,
      zoneDistrict: getClaimString(parsedDocs, "zone_district"),
      constructor: constructorName,
      developer: developerName,
      totalLandArea: val("total_land_area"),
      totalFloorArea: val("total_floor_area"),
      buildingCoverageRatio: val("building_coverage_ratio"),
      floorAreaRatio: val("floor_area_ratio"),
      aboveFloors: val("above_floors"),
      belowFloors: val("below_floors"),
      buildingCount: val("building_count"),
      totalUnits: val("total_units"),
      purpose: projectType,
      constructionPeriodMonths: val("construction_period_months") || 48,
    },
    structureDiagram: {
      buyer: "수분양자",
      developer: developerName,
      lenders: [],
      trustCompany: getClaimString(parsedDocs, "trust_company") || "미정",
      constructor: constructorName,
    },
    schedule: [],
    salePlan: {
      excludingExpansion: [],
      includingExpansion: [],
    },
    paymentSchedule: [],
    fundingPlan: {
      existingPfAmount: val("existing_pf_amount"),
      newPfAmount: val("new_pf_amount"),
      pfTotal: val("pf_total"),
      equityAmount: val("equity_amount"),
      pfInterestRateExisting: val("pf_interest_rate_existing"),
      pfInterestRateNew: val("pf_interest_rate_new"),
      pfMaturityMonths: val("pf_maturity") || 48,
      trustCompany: getClaimString(parsedDocs, "trust_company") || "미정",
      lenders: [],
    },
    landStatus: [],
  };

  // ── II~V + 부록 ──
  const developerAnalysis = buildDeveloperAnalysis(apiData);
  const marketAnalysis = buildMarketAnalysis(apiData);
  const priceAdequacy = buildPriceAdequacy(
    calcResults.priceForecast,
    apiData,
    val("planned_sale_price"),
    address
  );
  const repaymentAnalysis = buildRepaymentAnalysis(calcResults);
  const appendices = buildAppendices(apiData);

  // ── 메타데이터 ──
  const metadata: ScrMetadata = {
    version: "1.0.0",
    generatedAt: now,
    sourceFiles: parsedDocs.map((d) => d.filename),
    vScore: undefined,
    disclaimer: frontMatter.disclaimer,
  };

  return {
    frontMatter,
    projectOverview,
    developerAnalysis,
    marketAnalysis,
    priceAdequacy,
    repaymentAnalysis,
    appendices,
    metadata,
  };
}

