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
import type { PriceResult } from "@/lib/molit-api";
import type { StaticMarketContext } from "./static-data";
import {
  buildDeveloperAnalysis,
  buildMarketAnalysis,
  buildPriceAdequacy,
  buildRepaymentAnalysis,
  buildAppendices,
} from "./scr-assembler-builders";
import type { ScrAiNarratives } from "./scr-ai-narratives";

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
  salesTransactions: PriceResult | null;
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

/** 파싱 데이터에서 JSON 형식 claim key 파싱 */
function getClaimJson<T>(
  parsedDocs: ParsedDocument[],
  key: ScrClaimKey
): T | null {
  for (const doc of parsedDocs) {
    const extracted = doc.extractedData[key];
    if (extracted?.context) {
      try {
        return JSON.parse(extracted.context) as T;
      } catch {
        /* skip */
      }
    }
  }
  return null;
}

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
  options: { analyst?: string },
  aiNarratives?: ScrAiNarratives | null
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
  const constructionMonths = val("construction_period_months") || 48;
  const totalUnits = val("total_units");

  // 분양계획: sale_type_detail JSON → ScrSaleTypeRow[]
  type SaleRow = { type: string; units: number; exclusiveArea: number; supplyArea: number; pricePerExclusivePyeong: number; pricePerSupplyPyeong: number; pricePerUnit: number; totalRevenue: number; ratio: number };

  const saleTypeRaw = getClaimJson<
    { type: string; units: number; exclusiveArea: number; supplyArea: number; pricePerPyeong: number; pricePerUnit?: number; totalRevenue?: number }[]
  >(parsedDocs, "sale_type_detail");

  const saleRows: SaleRow[] = saleTypeRaw?.length
    ? saleTypeRaw.map((r) => ({
        type: r.type,
        units: r.units,
        exclusiveArea: r.exclusiveArea,
        supplyArea: r.supplyArea,
        pricePerExclusivePyeong: r.pricePerPyeong,
        pricePerSupplyPyeong: r.supplyArea > 0 ? Math.round(r.pricePerPyeong * r.exclusiveArea / r.supplyArea) : 0,
        pricePerUnit: r.pricePerUnit ?? Math.round(r.pricePerPyeong * r.exclusiveArea / 3.3058),
        totalRevenue: r.totalRevenue ?? Math.round(r.pricePerPyeong * r.exclusiveArea / 3.3058 * r.units),
        ratio: 0,
      }))
    : ([
        val("revenue_apartment") > 0
          ? { type: "아파트", units: totalUnits || 1, exclusiveArea: 84, supplyArea: 110, pricePerExclusivePyeong: val("planned_sale_price"), pricePerSupplyPyeong: 0, pricePerUnit: 0, totalRevenue: val("revenue_apartment"), ratio: 0 }
          : null,
        val("revenue_officetel") > 0
          ? { type: "오피스텔", units: 0, exclusiveArea: 24, supplyArea: 33, pricePerExclusivePyeong: 0, pricePerSupplyPyeong: 0, pricePerUnit: 0, totalRevenue: val("revenue_officetel"), ratio: 0 }
          : null,
        val("revenue_commercial") > 0
          ? { type: "상가", units: 0, exclusiveArea: 0, supplyArea: 0, pricePerExclusivePyeong: 0, pricePerSupplyPyeong: 0, pricePerUnit: 0, totalRevenue: val("revenue_commercial"), ratio: 0 }
          : null,
      ].filter(Boolean) as SaleRow[]);

  // 비율 계산
  const saleTotal = saleRows.reduce((s, r) => s + r.totalRevenue, 0);
  saleRows.forEach((r) => { r.ratio = saleTotal > 0 ? (r.totalRevenue / saleTotal) * 100 : 0; });

  // 공정일정 자동 생성
  const baseDate = new Date();
  const addM = (m: number) => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  const schedule = [
    { milestone: "인허가", plannedDate: addM(0), status: "완료" as const },
    { milestone: "착공", plannedDate: addM(1), status: "완료" as const },
    { milestone: "분양승인", plannedDate: addM(3), status: "진행중" as const },
    { milestone: "분양개시", plannedDate: addM(4), status: "예정" as const },
    { milestone: "준공", plannedDate: addM(constructionMonths), status: "예정" as const },
  ];

  // 납부일정 표준 생성
  const paymentSchedule = [
    { stage: "계약금", percentage: 10, dueDate: "계약 시" },
    { stage: "중도금 1차", percentage: 10, dueDate: addM(6) },
    { stage: "중도금 2차", percentage: 10, dueDate: addM(9) },
    { stage: "중도금 3차", percentage: 10, dueDate: addM(12) },
    { stage: "중도금 4차", percentage: 10, dueDate: addM(15) },
    { stage: "중도금 5차", percentage: 10, dueDate: addM(18) },
    { stage: "중도금 6차", percentage: 10, dueDate: addM(21) },
    { stage: "잔금", percentage: 30, dueDate: addM(constructionMonths) },
  ];

  // 토지현황
  const landPrivateArea = val("land_private_area");
  const landPublicArea = val("land_public_area");
  const landStatus = [
    ...(landPrivateArea > 0
      ? [{ parcel: "사유지", landType: "사유지" as const, area: landPrivateArea, pricePerPyeong: val("land_avg_price_per_pyeong"), totalPrice: val("land_private_price"), }]
      : []),
    ...(landPublicArea > 0
      ? [{ parcel: "공유지", landType: "공유지" as const, area: landPublicArea, pricePerPyeong: val("land_avg_price_per_pyeong"), totalPrice: val("land_public_price"), }]
      : []),
    ...(landPrivateArea === 0 && landPublicArea === 0 && val("cost_land") > 0
      ? [{ parcel: "합계", landType: "사유지" as const, area: val("total_land_area"), pricePerPyeong: val("land_avg_price_per_pyeong"), totalPrice: val("cost_land"), }]
      : []),
  ];

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
      totalUnits,
      purpose: projectType,
      constructionPeriodMonths: constructionMonths,
    },
    structureDiagram: {
      buyer: "수분양자",
      developer: developerName,
      lenders: ["미정"],
      trustCompany: getClaimString(parsedDocs, "trust_company") || "미정",
      constructor: constructorName,
    },
    schedule,
    salePlan: {
      excludingExpansion: saleRows,
      includingExpansion: saleRows, // 확장 포함 = 동일 (확장비 별도 파싱 시 분리)
    },
    paymentSchedule,
    fundingPlan: {
      existingPfAmount: val("existing_pf_amount"),
      newPfAmount: val("new_pf_amount"),
      pfTotal: val("pf_total"),
      equityAmount: val("equity_amount"),
      pfInterestRateExisting: val("pf_interest_rate_existing"),
      pfInterestRateNew: val("pf_interest_rate_new"),
      pfMaturityMonths: val("pf_maturity") || 48,
      trustCompany: getClaimString(parsedDocs, "trust_company") || "미정",
      lenders: ["미정"],
    },
    landStatus,
  };

  // ── II~V + 부록 ──
  const n = aiNarratives ?? undefined;
  const developerAnalysis = buildDeveloperAnalysis(apiData, developerName, n?.developerAnalysis, frontMatter.projectName, address);
  const marketAnalysis = buildMarketAnalysis(apiData, district, n?.demographicNarrative, n?.housingNarrative);
  const priceAdequacy = buildPriceAdequacy(
    calcResults.priceForecast,
    apiData,
    val("planned_sale_price"),
    address,
    n?.locationNarrative,
    n?.priceConclusion,
    totalUnits,
    projectType
  );
  const repaymentAnalysis = buildRepaymentAnalysis(
    calcResults,
    parsedDocs,
    n?.incomeNarrative,
    n?.cashflowNarrative,
    n?.scenarioNarrative,
    n?.overallConclusion
  );
  const appendices = buildAppendices(apiData, district);

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

