/**
 * SCR 보고서 오케스트레이터 (SCR Report Orchestrator)
 *
 * 전체 SCR 보고서 생성 파이프라인을 조율하는 메인 모듈.
 * PDF 파싱 → 외부 API 데이터 수집 → 계산 엔진 실행 → 보고서 조립
 *
 * @module lib/feasibility/scr-orchestrator
 */

import type { ParsedDocument, ExtractedValue } from "./feasibility-types";
import type { ProjectType } from "./scr-types";
import type { ScrReportData } from "./scr-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import { generateAiNarratives } from "./scr-ai-narratives";

// 외부 API
import {
  fetchPopulationTrends,
  fetchHousingSupply,
  fetchCorpInfo,
  fetchFinancials,
  searchCorpCode,
  fetchSalePriceIndex,
  fetchRentPriceIndex,
  fetchMOISPopulation,
  fetchMOISAgePopulation,
} from "./api";
import { fetchRecentPrices } from "@/lib/molit-api";

// 계산 엔진
import {
  calculateBusinessIncome,
  calculateBep,
  calculateDscr,
  generateMonthlyCashflow,
  calculateScenarios,
  analyzeSensitivity,
  forecastPrice,
  type BusinessIncomeInput,
} from "./calc";

// 정적 데이터
import { getStaticMarketContext } from "./static-data";

// 보고서 조립 (Step 4)
import {
  assembleReport,
  getClaimValue,
  getClaimString,
  type ExternalApiData,
  type CalcResults,
} from "./scr-assembler";

// ─── re-export (기존 import 경로 유지) ───
export type { ExternalApiData, CalcResults } from "./scr-assembler";
export { getClaimValue, getClaimString } from "./scr-assembler";

// ─── 입력 타입 ───

/** SCR 보고서 생성 입력값 */
export interface ScrReportInput {
  parsedDocs: ParsedDocument[];
  projectType: ProjectType;
  options?: ScrReportOptions;
  onProgress?: (progress: number, message: string) => void;
}

/** SCR 보고서 생성 옵션 */
export interface ScrReportOptions {
  scenarioSaleRates?: number[];
  sensitivityChangePercents?: number[];
  constructionMonths?: number;
  analyst?: string;
}

// ─── 유틸 ───

/** 파싱 데이터에서 모든 ExtractedValue를 하나로 병합 */
function mergeExtractedData(
  parsedDocs: ParsedDocument[]
): Record<string, ExtractedValue> {
  const merged: Record<string, ExtractedValue> = {};
  for (const doc of parsedDocs) {
    for (const [key, val] of Object.entries(doc.extractedData)) {
      if (!merged[key] || (val && val.value !== 0)) {
        merged[key] = val;
      }
    }
  }
  return merged;
}

/** 소재지에서 시군구 추출 */
function extractDistrict(address: string): string {
  const match = address.match(
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\S*\s+\S+(?:시|군|구)/
  );
  return match ? match[0] : address.slice(0, 20);
}

// ─── 메인 함수 ───

/**
 * SCR 보고서를 생성합니다
 *
 * 파이프라인:
 * 1. 파싱 데이터 통합
 * 2. 외부 API 데이터 수집
 * 3. 계산 엔진 실행
 * 4. 보고서 조립
 */
export async function generateScrReport(
  input: ScrReportInput
): Promise<ScrReportData> {
  const { parsedDocs, projectType, options = {}, onProgress } = input;

  const progress = (pct: number, msg: string) => {
    onProgress?.(pct, msg);
  };

  // ── Step 1: 파싱 데이터 통합 ──
  progress(5, "파싱 데이터 통합 중...");
  const mergedData = mergeExtractedData(parsedDocs);
  const address =
    getClaimString(parsedDocs, "site_address") || "주소 미상";
  const district = extractDistrict(address);
  const developerName =
    getClaimString(parsedDocs, "developer") || "시행사 미상";
  const constructorName =
    getClaimString(parsedDocs, "constructor") || "시공사 미상";

  // ── Step 2: 외부 API 데이터 수집 ──
  progress(15, "외부 데이터 수집 중...");
  const apiData = await collectExternalData(district, developerName, address);
  progress(40, "외부 데이터 수집 완료");

  // ── Step 3: 계산 엔진 실행 ──
  progress(50, "계산 엔진 실행 중...");
  const calcResults = runCalculations(
    parsedDocs,
    mergedData,
    apiData,
    address,
    projectType,
    options
  );
  progress(70, "계산 엔진 완료");

  // ── Step 3.5: AI 분석 서술 생성 ──
  progress(72, "AI 분석 서술 생성 중...");
  const totalUnits = getClaimValue(parsedDocs, "total_units");
  const aiNarratives = await generateAiNarratives({
    projectName: getClaimString(parsedDocs, "building_name") || "미정",
    address,
    district,
    developerName,
    constructorName,
    totalUnits,
    projectType,
    calcResults,
    apiData,
  });
  progress(80, aiNarratives ? "AI 분석 완료" : "AI 분석 생략");

  // ── Step 4: 보고서 조립 ──
  progress(82, "보고서 조립 중...");
  const report = assembleReport(
    parsedDocs,
    mergedData,
    apiData,
    calcResults,
    projectType,
    address,
    district,
    developerName,
    constructorName,
    options,
    aiNarratives
  );
  progress(100, "보고서 생성 완료");

  return report;
}

// ─── Step 2: 외부 API 데이터 수집 ───

async function collectExternalData(
  district: string,
  developerName: string,
  address: string
): Promise<ExternalApiData> {
  const [
    populationTrends,
    housingSupply,
    corpSearch,
    salePriceIndex,
    rentPriceIndex,
    moisPopulation,
    moisAge,
    salesTransactions,
  ] = await Promise.all([
    fetchPopulationTrends(district).catch(() => null),
    fetchHousingSupply(district).catch(() => null),
    searchCorpCode(developerName).catch(() => null),
    fetchSalePriceIndex(district).catch(() => null),
    fetchRentPriceIndex(district).catch(() => null),
    fetchMOISPopulation(district).catch(() => null),
    fetchMOISAgePopulation(district).catch(() => null),
    fetchRecentPrices(address, 6).catch(() => null),
  ]);

  let corpInfo = null;
  let financials = null;

  if (corpSearch?.corpCode) {
    [corpInfo, financials] = await Promise.all([
      fetchCorpInfo(corpSearch.corpCode).catch(() => null),
      fetchFinancials(corpSearch.corpCode, 6).catch(() => null),
    ]);
  }

  const staticMarket = getStaticMarketContext(district);

  return {
    populationTrends,
    housingSupply,
    corpInfo,
    financials,
    salePriceIndex,
    rentPriceIndex,
    moisPopulation,
    moisAge,
    staticMarket,
    salesTransactions,
  };
}

// ─── Step 3: 계산 엔진 실행 ───

function runCalculations(
  parsedDocs: ParsedDocument[],
  mergedData: Record<string, ExtractedValue>,
  apiData: ExternalApiData,
  address: string,
  projectType: ProjectType,
  options: ScrReportOptions
): CalcResults {
  const val = (key: ScrClaimKey): number => getClaimValue(parsedDocs, key);

  const businessIncomeInput: BusinessIncomeInput = {
    revenueApartment: val("revenue_apartment"),
    revenueOfficetel: val("revenue_officetel"),
    revenueBalcony: val("revenue_balcony"),
    revenueCommercial: val("revenue_commercial"),
    revenueInterimInterest: val("revenue_interim_interest"),
    revenueVat: val("revenue_vat"),
    costLand: val("cost_land"),
    costDirectConstruction: val("cost_direct_construction"),
    costIndirectConstruction: val("cost_indirect_construction"),
    costSales: val("cost_sales"),
    costGeneralAdmin: val("cost_general_admin"),
    costTax: val("cost_tax"),
    costPfFee: val("cost_pf_fee"),
    costPfInterest: val("cost_pf_interest"),
    costInterimInterest: val("cost_interim_interest"),
  };
  const businessIncome = calculateBusinessIncome(businessIncomeInput);

  const pfTotal = val("pf_total");
  const equityAmount = val("equity_amount");
  const totalRevenue = businessIncome.totalRevenue;
  const totalCost = businessIncome.totalCost;

  const aptRevenueRatio =
    totalRevenue > 0 ? val("revenue_apartment") / totalRevenue : 0.7;
  const offRevenueRatio =
    totalRevenue > 0 ? val("revenue_officetel") / totalRevenue : 0.15;
  const comRevenueRatio =
    totalRevenue > 0 ? val("revenue_commercial") / totalRevenue : 0.1;

  const bep = calculateBep({
    totalRevenue,
    totalCost,
    equity: equityAmount,
    constructionReserve: 0,
    pfTotal,
    apartmentRevenueRatio: aptRevenueRatio,
    officetelRevenueRatio: offRevenueRatio,
    commercialRevenueRatio: comRevenueRatio,
  });

  const dscr = calculateDscr({
    totalRevenue,
    pfTotal,
    pfInterestTotal: val("cost_pf_interest"),
    equity: equityAmount,
    constructionReserve: 0,
  });

  const constructionMonths = options.constructionMonths || 48;
  const startDate = new Date().toISOString().slice(0, 7);

  const monthlyCashflow = generateMonthlyCashflow({
    startDate,
    constructionMonths,
    businessIncome,
    revenueSchedule: buildDefaultRevenueSchedule(
      businessIncomeInput,
      constructionMonths
    ),
    costSchedule: buildDefaultCostSchedule(
      businessIncomeInput,
      constructionMonths
    ),
    funding: {
      equityInvestment: equityAmount,
      equityInvestmentMonth: 1,
      existingPfDrawdown: val("existing_pf_amount"),
      existingPfDrawdownMonth: 1,
      newPfDrawdown: val("new_pf_amount"),
      newPfDrawdownMonth: 3,
      existingPfRepayment: val("existing_pf_amount"),
      existingPfRepaymentMonth: constructionMonths,
      newPfRepayment: val("new_pf_amount"),
      newPfRepaymentMonth: constructionMonths,
      equityRecovery: equityAmount,
      equityRecoveryMonth: constructionMonths,
    },
  });

  const saleRates = options.scenarioSaleRates || [1.0, 0.95, 0.9, 0.85];
  const scenarioNames = ["차주안", "시나리오1", "시나리오2", "시나리오3"];

  const scenarios = calculateScenarios({
    baseIncome: businessIncome,
    baseInput: businessIncomeInput,
    scenarios: saleRates.slice(1).map((rate, i) => ({
      name: scenarioNames[i + 1] || `시나리오${i + 1}`,
      apartmentSaleRate: rate,
      officetelSaleRate: Math.min(rate + 0.05, 1.0),
      commercialSaleRate: Math.max(0, Math.min(rate - 0.05, 1.0)),
    })),
  });

  const sensitivity = analyzeSensitivity({
    baseRevenue: totalRevenue,
    totalCost,
    pfTotal,
    pfInterestTotal: val("cost_pf_interest"),
    equity: equityAmount,
    constructionReserve: 0,
    totalSalePriceAtFull: totalRevenue,
    scenarios: saleRates.map((rate, i) => ({
      name: scenarioNames[i] || `시나리오${i}`,
      saleRate: rate,
    })),
  });

  const salePriceIndices = apiData.salePriceIndex?.indices || [];
  const priceForecast = forecastPrice({
    address,
    projectType: projectType === "재건축" ? "재건축" : "신축",
    completionDate: addMonthsToNow(constructionMonths),
    plannedPricePerPyeong: val("planned_sale_price"),
    nearbyCases: [],
    regionalPriceIndex: salePriceIndices.map((idx) => ({
      month: idx.yearMonth,
      index: idx.index,
    })),
  });

  return {
    businessIncome,
    bep,
    dscr,
    monthlyCashflow,
    scenarios,
    sensitivity,
    priceForecast,
  };
}

// ─── 유틸 함수들 ───

/** 현재 시점에서 N개월 후의 YYYY-MM 반환 */
function addMonthsToNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 기본 수입 스케줄 생성 */
function buildDefaultRevenueSchedule(
  input: BusinessIncomeInput,
  months: number
) {
  const saleStartMonth = 3;
  const saleMonths = months - saleStartMonth;
  const monthlyApt =
    saleMonths > 0 ? input.revenueApartment / saleMonths : 0;
  const monthlyOff =
    saleMonths > 0 ? input.revenueOfficetel / saleMonths : 0;
  const monthlyBal =
    saleMonths > 0 ? input.revenueBalcony / saleMonths : 0;
  const monthlyCom =
    saleMonths > 0 ? input.revenueCommercial / saleMonths : 0;
  const monthlyInt =
    saleMonths > 0 ? input.revenueInterimInterest / saleMonths : 0;
  const monthlyVat =
    saleMonths > 0 ? input.revenueVat / saleMonths : 0;

  const makeSchedule = (monthlyAmount: number) => {
    const entries = [];
    for (let m = saleStartMonth; m <= months; m++) {
      entries.push({ month: m, amount: monthlyAmount });
    }
    return entries;
  };

  return {
    apartment: makeSchedule(monthlyApt),
    officetel: makeSchedule(monthlyOff),
    balcony: makeSchedule(monthlyBal),
    commercial: makeSchedule(monthlyCom),
    interimInterest: makeSchedule(monthlyInt),
    vat: makeSchedule(monthlyVat),
  };
}

/** 기본 지출 스케줄 생성 */
function buildDefaultCostSchedule(
  input: BusinessIncomeInput,
  months: number
) {
  const monthlyDirect =
    months > 0 ? input.costDirectConstruction / months : 0;
  const monthlyIndirect =
    months > 0 ? input.costIndirectConstruction / months : 0;
  const monthlyAdmin =
    months > 0 ? input.costGeneralAdmin / months : 0;
  const monthlyPfInt =
    months > 0 ? input.costPfInterest / months : 0;

  const makeMonthlySchedule = (monthlyAmount: number) => {
    const entries = [];
    for (let m = 1; m <= months; m++) {
      entries.push({ month: m, amount: monthlyAmount });
    }
    return entries;
  };

  return {
    land: [{ month: 1, amount: input.costLand }],
    directConstruction: makeMonthlySchedule(monthlyDirect),
    indirectConstruction: makeMonthlySchedule(monthlyIndirect),
    sales: [{ month: 3, amount: input.costSales }],
    generalAdmin: makeMonthlySchedule(monthlyAdmin),
    tax: [
      { month: 1, amount: input.costTax * 0.5 },
      { month: months, amount: input.costTax * 0.5 },
    ],
    pfFee: [{ month: 1, amount: input.costPfFee }],
    pfInterest: makeMonthlySchedule(monthlyPfInt),
    interimInterest: [
      { month: Math.round(months * 0.7), amount: input.costInterimInterest },
    ],
  };
}
