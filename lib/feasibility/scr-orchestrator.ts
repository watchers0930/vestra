/**
 * SCR 보고서 오케스트레이터 (SCR Report Orchestrator)
 *
 * 전체 SCR 보고서 생성 파이프라인을 조율하는 메인 모듈.
 * PDF 파싱 → 외부 API 데이터 수집 → 계산 엔진 실행 → 보고서 조립
 *
 * @module lib/feasibility/scr-orchestrator
 */

import type { ParsedDocument, ExtractedValue } from "./feasibility-types";
import type {
  ScrReportData,
  ScrFrontMatter,
  ScrProjectOverview,
  ScrDeveloperAnalysis,
  ScrMarketAnalysis,
  ScrPriceAdequacy,
  ScrRepaymentAnalysis,
  ScrAppendices,
  ScrMetadata,
  ScrBusinessIncome,
  ScrScenarioAnalysis,
  ScrBepAnalysis,
  ProjectType,
  MonthlyRow as ScrMonthlyRow,
} from "./scr-types";
import type { ScrClaimKey } from "./scr-claim-keys";

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
  type KOSISPopulationResult,
  type KOSISHousingResult,
  type DARTCorpInfo,
  type DARTFinancialResult,
  type REPSSalePriceResult,
  type REPSRentPriceResult,
  type MOISPopulationResult,
  type MOISAgeResult,
} from "./api";

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
  type BusinessIncomeResult,
  type BepResult,
  type DscrResult,
  type MonthlyCashflowResult,
  type ScenarioResult,
  type SensitivityResult,
  type PriceForecastResult,
} from "./calc";

// 정적 데이터
import {
  getStaticMarketContext,
  getNearbySupplyCases,
  type StaticMarketContext,
  type SupplyCaseEntry,
} from "./static-data";

// ─── 입력 타입 ───

/** SCR 보고서 생성 입력값 */
export interface ScrReportInput {
  /** 파싱된 문서들 */
  parsedDocs: ParsedDocument[];

  /** 사업 유형 */
  projectType: ProjectType;

  /** 옵션 */
  options?: ScrReportOptions;

  /** 진행률 콜백 (0~100) */
  onProgress?: (progress: number, message: string) => void;
}

/** SCR 보고서 생성 옵션 */
export interface ScrReportOptions {
  /** 시나리오 분양률 (기본: [1.0, 0.95, 0.90, 0.85]) */
  scenarioSaleRates?: number[];

  /** 민감도 분석 변동률 (기본: [-10, -5, 0, 5, 10]) */
  sensitivityChangePercents?: number[];

  /** 공사기간 월수 (기본: 48) */
  constructionMonths?: number;

  /** 보고서 발행자 */
  analyst?: string;
}

// ─── 내부: 외부 API 수집 결과 ───

interface ExternalApiData {
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

// ─── 내부: 계산 엔진 결과 ───

interface CalcResults {
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
function getClaimValue(
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
function getClaimString(
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
 * 1. 파싱 데이터 통합 (PDF에서 추출된 수치 병합)
 * 2. 외부 API 데이터 수집 (KOSIS, DART, REPS, MOIS + 정적 폴백)
 * 3. 계산 엔진 실행 (사업수지, BEP, DSCR, 월별자금수지, 시나리오, 민감도, 시세예측)
 * 4. 보고서 조립 (I~V장 + 부록 + 메타데이터)
 *
 * 각 단계에서 에러 발생 시 부분 결과를 반환합니다 (graceful degradation).
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

  // ── Step 2: 외부 API 데이터 수집 (병렬, 실패 시 null) ──
  progress(15, "외부 데이터 수집 중...");
  const apiData = await collectExternalData(district, developerName);
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

  // ── Step 4: 보고서 조립 ──
  progress(80, "보고서 조립 중...");
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
    options
  );
  progress(100, "보고서 생성 완료");

  return report;
}

// ─── Step 2: 외부 API 데이터 수집 ───

async function collectExternalData(
  district: string,
  developerName: string
): Promise<ExternalApiData> {
  // 모든 API를 병렬 호출, 실패 시 null 반환
  const [
    populationTrends,
    housingSupply,
    corpSearch,
    salePriceIndex,
    rentPriceIndex,
    moisPopulation,
    moisAge,
  ] = await Promise.all([
    fetchPopulationTrends(district).catch(() => null),
    fetchHousingSupply(district).catch(() => null),
    searchCorpCode(developerName).catch(() => null),
    fetchSalePriceIndex(district).catch(() => null),
    fetchRentPriceIndex(district).catch(() => null),
    fetchMOISPopulation(district).catch(() => null),
    fetchMOISAgePopulation(district).catch(() => null),
  ]);

  // DART 법인코드가 검색되면 추가 조회
  let corpInfo: DARTCorpInfo | null = null;
  let financials: DARTFinancialResult | null = null;

  if (corpSearch?.corpCode) {
    [corpInfo, financials] = await Promise.all([
      fetchCorpInfo(corpSearch.corpCode).catch(() => null),
      fetchFinancials(corpSearch.corpCode, 6).catch(() => null),
    ]);
  }

  // 정적 폴백 (항상 가용)
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

  // ── 사업수지 ──
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

  // ── BEP ──
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

  // ── DSCR ──
  const dscr = calculateDscr({
    totalRevenue,
    pfTotal,
    pfInterestTotal: val("cost_pf_interest"),
    equity: equityAmount,
    constructionReserve: 0,
  });

  // ── 월별 자금수지 ──
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

  // ── 시나리오 ──
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

  // ── 민감도 ──
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

  // ── 시세 예측 ──
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

// ─── Step 4: 보고서 조립 ───

function assembleReport(
  parsedDocs: ParsedDocument[],
  mergedData: Record<string, ExtractedValue>,
  apiData: ExternalApiData,
  calcResults: CalcResults,
  projectType: ProjectType,
  address: string,
  district: string,
  developerName: string,
  constructorName: string,
  options: ScrReportOptions
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

  // ── II. 사업주체 분석 ──
  const developerAnalysis: ScrDeveloperAnalysis = buildDeveloperAnalysis(
    apiData
  );

  // ── III. 시장 환경 분석 ──
  const marketAnalysis: ScrMarketAnalysis = buildMarketAnalysis(
    apiData,
    address
  );

  // ── IV. 분양가 적정성 검토 ──
  const priceAdequacy: ScrPriceAdequacy = buildPriceAdequacy(
    calcResults.priceForecast,
    apiData,
    val("planned_sale_price"),
    address
  );

  // ── V. 원리금상환가능성 분석 ──
  const repaymentAnalysis: ScrRepaymentAnalysis = buildRepaymentAnalysis(
    calcResults,
    parsedDocs
  );

  // ── 부록 ──
  const appendices: ScrAppendices = buildAppendices(apiData);

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

// ─── 하위 조립 함수들 ───

function buildDeveloperAnalysis(
  apiData: ExternalApiData
): ScrDeveloperAnalysis {
  const corp = apiData.corpInfo;
  const fin = apiData.financials;

  return {
    companyOverview: {
      companyName: corp?.corpName || "미확인",
      ceoName: corp?.ceoName || "",
      establishedDate: corp?.establishDate || "",
      employeeCount: 0,
      mainBusiness: "부동산개발",
      address: "",
      creditRating: undefined,
    },
    shareholders: [],
    ongoingProjects: [],
    orderBacklog: [],
    profitability: (fin?.incomeStatements || []).map((is) => ({
      year: is.year,
      revenue: is.revenue,
      costOfRevenue: is.costOfSales,
      grossProfit: is.grossProfit,
      sgaExpense: 0,
      operatingProfit: is.operatingProfit,
      ebitda: is.ebitda,
      nonOperatingIncome: 0,
      netIncome: is.netIncome,
    })),
    financialStability: {
      balanceSheet: (fin?.balanceSheets || []).map((bs) => ({
        year: bs.year,
        totalAssets: bs.totalAssets,
        totalLiabilities: bs.totalLiabilities,
        totalBorrowings: 0,
        borrowingDependency: 0,
        debtRatio:
          bs.totalAssets > 0
            ? Math.round(
                (bs.totalLiabilities / bs.totalAssets) * 10000
              ) / 100
            : 0,
        equity: bs.totalAssets - bs.totalLiabilities,
      })),
      liquidity: [],
      borrowingDetail: [],
    },
    cashFlow: [],
  };
}

function buildMarketAnalysis(
  apiData: ExternalApiData,
  address: string
): ScrMarketAnalysis {
  const { staticMarket } = apiData;
  const loanRegs = staticMarket.loanRegulations;

  // 대표 LTV/DTI/DSR 비율 추출
  const ltvRatio = loanRegs.ltv[0]?.ratio || 70;
  const dtiRatio = loanRegs.dti[0]?.ratio || 60;
  const dsrRatio = loanRegs.dsr[0]?.ratio || 40;

  // 인구 데이터
  const popTrends = apiData.populationTrends?.trends || [];
  const moiPop = apiData.moisPopulation?.trends || [];
  const moisAge = apiData.moisAge?.ageGroups || [];

  return {
    regulations: {
      ltvRatio,
      dtiRatio,
      dsrRatio,
      resaleRestrictionMonths: 0,
      subscriptionRestriction: staticMarket.regulationStatus.isRegulated
        ? "규제지역 청약 제한 적용"
        : "비규제지역 (청약 제한 없음)",
      regulatedAreaType: staticMarket.regulationStatus.isRegulated
        ? staticMarket.regulationStatus.regulations[0]?.type
        : undefined,
      summary: staticMarket.regulationStatus.isRegulated
        ? "현재 규제지역으로 지정되어 있습니다."
        : "현재 규제지역 해제 상태입니다.",
    },
    demographics: {
      populationHousehold: popTrends.map((t) => ({
        year: t.year,
        population: t.population,
        households: t.households,
        personsPerHousehold:
          t.households > 0
            ? Math.round((t.population / t.households) * 100) / 100
            : 0,
      })),
      ageDistribution: moisAge.map((ag) => ({
        ageGroup: ag.ageGroup,
        count: ag.total,
        ratio: 0,
      })),
      industryEmployment: [],
    },
    housingMarket: {
      supplyRate:
        apiData.housingSupply?.trends.map((t) => ({
          year: t.year,
          supplyRate: t.supplyRate,
          totalHousing: t.totalHousing,
          apartment: 0,
          rowHouse: 0,
          detached: 0,
          other: 0,
        })) || [],
      transactions: [],
      housingDistribution: [],
      buildingAge: [],
      supplyByArea: [],
      upcomingSupply: [],
      plannedSupply: [],
      unsoldTrend: [],
      unsoldComplexes: [],
    },
  };
}

function buildPriceAdequacy(
  priceForecast: PriceForecastResult,
  apiData: ExternalApiData,
  plannedPrice: number,
  address: string = ""
): ScrPriceAdequacy {
  const comp = priceForecast.priceComparison;

  return {
    location: {
      transportation: [],
      livingInfra: [],
      education: [],
      summary: "",
    },
    nearbyDevelopment: [],
    facilityOverview: "",
    priceReview: {
      regionalTrend:
        apiData.salePriceIndex?.indices.map((idx) => {
          const year = parseInt(idx.yearMonth.split("-")[0], 10);
          return {
            year,
            avgMarketPrice: idx.index,
            avgSalePrice: plannedPrice,
            premiumRate: 0,
          };
        }) || [],
      salesCases: [],
      supplyCases: getNearbySupplyCases(address, 8).map(
        (sc: SupplyCaseEntry) => ({
          complexName: sc.name,
          address: sc.address,
          developer: "",
          constructor: "",
          totalUnits: sc.units,
          exclusiveArea: 0,
          supplyArea: 0,
          saleDate: sc.supplyDate,
          salePricePerPyeong: Math.round(sc.pricePerSqm * 3.3058),
          currentMarketPrice: undefined,
          premiumRate: undefined,
          saleRate: sc.saleRate,
          note: `${sc.projectType} / 경쟁률 ${sc.competitionRate}:1`,
        })
      ),
      premiumAnalysis: [],
    },
    adequacyOpinion: {
      plannedPrice: [
        {
          type: "대표타입",
          pricePerPyeong: plannedPrice,
          totalPrice: 0,
        },
      ],
      comparison: [
        {
          target: "인근 평균 시세",
          pricePerPyeong: comp.currentAvg,
          gap: comp.gapAmount,
          gapRate: comp.gapRate,
        },
      ],
      conclusion: `본건 계획 분양가(${plannedPrice.toLocaleString()}만원/평)는 ` +
        `인근 평균 시세(${comp.currentAvg.toLocaleString()}만원/평) 대비 ` +
        `${comp.gapRate > 0 ? "+" : ""}${comp.gapRate}%로, ` +
        `${comp.assessment} 수준으로 판단됩니다.`,
    },
  };
}

function buildRepaymentAnalysis(
  calcResults: CalcResults,
  parsedDocs: ParsedDocument[]
): ScrRepaymentAnalysis {
  const { businessIncome, monthlyCashflow, scenarios, sensitivity, bep } =
    calcResults;

  // 사업수지 (표41)
  const scrBusinessIncome: ScrBusinessIncome = {
    revenue: {
      apartment: businessIncome.breakdown.find(
        (b) => b.item === "아파트 분양수입"
      )?.amount || 0,
      officetel: businessIncome.breakdown.find(
        (b) => b.item === "오피스텔 분양수입"
      )?.amount || 0,
      balconyExpansion: businessIncome.breakdown.find(
        (b) => b.item === "발코니확장비"
      )?.amount || 0,
      commercial: businessIncome.breakdown.find(
        (b) => b.item === "상가 분양수입"
      )?.amount || 0,
      interimInterest: businessIncome.breakdown.find(
        (b) => b.item === "중도금이자후불"
      )?.amount || 0,
      vat: businessIncome.breakdown.find(
        (b) => b.item === "VAT"
      )?.amount || 0,
      total: businessIncome.totalRevenue,
    },
    cost: {
      land: businessIncome.breakdown.find(
        (b) => b.item === "토지비"
      )?.amount || 0,
      directConstruction: businessIncome.breakdown.find(
        (b) => b.item === "직접공사비"
      )?.amount || 0,
      indirectConstruction: businessIncome.breakdown.find(
        (b) => b.item === "간접공사비"
      )?.amount || 0,
      salesExpense: businessIncome.breakdown.find(
        (b) => b.item === "판매비"
      )?.amount || 0,
      generalAdmin: businessIncome.breakdown.find(
        (b) => b.item === "일반부대비용"
      )?.amount || 0,
      tax: businessIncome.breakdown.find(
        (b) => b.item === "제세공과금"
      )?.amount || 0,
      pfFee: businessIncome.breakdown.find(
        (b) => b.item === "PF 수수료"
      )?.amount || 0,
      pfInterest: businessIncome.breakdown.find(
        (b) => b.item === "PF 이자"
      )?.amount || 0,
      interimInterest: businessIncome.breakdown.find(
        (b) => b.item === "중도금대출이자"
      )?.amount || 0,
      total: businessIncome.totalCost,
    },
    profitBeforeTax: businessIncome.profitBeforeTax,
    profitRate: businessIncome.profitRate,
  };

  // 월별 자금수지 → ScrMonthlyRow 변환
  const toScrMonthly = (
    rows: CalcResults["monthlyCashflow"]["rows"]
  ): ScrMonthlyRow[] =>
    rows.map((r) => ({
      yearMonth: r.period,
      values: {
        수입합계: r.revenueTotal,
        지출합계: r.costTotal,
        사업수지: r.operatingCashflow,
        자금조달: r.fundingTotal,
        자금상환: r.repaymentTotal,
        현금증감: r.cashChange,
        현금잔액: r.cashBalance,
      },
    }));

  // 시나리오 분석
  const scenarioAnalysis: ScrScenarioAnalysis = {
    conditions: scenarios.projections.slice(1).map((p) => {
      const baseRev = scenarios.projections[0]?.totalRevenue || 1;
      const rate = p.totalRevenue / baseRev;
      return {
        scenario: mapScenarioName(p.name, rate),
        saleRate: Math.round(rate * 100),
        description: `${p.name}: 분양률 변동 시나리오`,
      };
    }),
    projections: scenarios.projections.map((p) => ({
      scenario: mapScenarioName(p.name, p.totalRevenue / (businessIncome.totalRevenue || 1)),
      totalRevenue: p.totalRevenue,
      totalCost: p.totalCost,
      profitBeforeTax: p.profitBeforeTax,
      profitRate: p.profitRate,
      repaymentPossible: p.profitBeforeTax >= 0,
    })),
    sensitivity: sensitivity.scenarios.map((s) => ({
      variable: "분양률",
      changePercent: s.maturitySaleRate - 100,
      profitImpact: s.profitBeforeTax,
      profitRateImpact: s.profitRate,
    })),
  };

  // BEP 분석
  const bepAnalysis: ScrBepAnalysis = {
    pfRepaymentBep: [
      {
        type: "전시설 동일",
        bepSaleRate: bep.bep1.pfExitBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.pfExitBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.pfExitBep,
        bepUnits: 0,
      },
    ],
    totalCostBep: [
      {
        type: "전시설 동일",
        bepSaleRate: bep.bep1.businessBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.businessBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.businessBep,
        bepUnits: 0,
      },
    ],
    scenarioBep: [
      {
        scenario: "전시설 동일",
        bepSaleRate: bep.bep1.businessBep,
        margin: 100 - bep.bep1.businessBep,
      },
      {
        scenario: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.businessBep,
        margin: 100 - bep.bep2.businessBep,
      },
      {
        scenario: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.businessBep,
        margin: 100 - bep.bep3.businessBep,
      },
    ],
  };

  return {
    assumptions:
      "본 분석은 차주가 제출한 사업계획서상의 수치를 기준으로 하며, " +
      "분양률 100% 기준 사업수지를 차주안으로 설정하였습니다.",
    periodSaleRate: [],
    businessIncome: scrBusinessIncome,
    cashFlowSummary: [
      {
        item: "분양수입 합계",
        amount: monthlyCashflow.summary.totalRevenue,
      },
      {
        item: "사업비 합계",
        amount: monthlyCashflow.summary.totalCost,
      },
      {
        item: "자금조달 합계",
        amount: monthlyCashflow.summary.totalFunding,
      },
      {
        item: "자금상환 합계",
        amount: monthlyCashflow.summary.totalRepayment,
      },
      {
        item: "최종 현금잔액",
        amount: monthlyCashflow.summary.finalCashBalance,
      },
    ],
    fundingScale: [],
    monthlyCashFlow: {
      part1: toScrMonthly(monthlyCashflow.part1),
      part2: toScrMonthly(monthlyCashflow.part2),
      part3: toScrMonthly(monthlyCashflow.part3),
    },
    scenario: scenarioAnalysis,
    bep: bepAnalysis,
  };
}

function buildAppendices(apiData: ExternalApiData): ScrAppendices {
  const { staticMarket } = apiData;

  return {
    policyHistory: staticMarket.recentPolicies.map((p) => ({
      date: p.date,
      policy: p.title,
      detail: p.description,
    })),
    loanRegulations: [
      ...staticMarket.loanRegulations.ltv.map((r) => ({
        category: r.category,
        condition: r.condition,
        ltv: r.ratio,
        dti: 0,
        note: r.area,
      })),
      ...staticMarket.loanRegulations.dti.map((r) => ({
        category: r.category,
        condition: r.condition,
        ltv: 0,
        dti: r.ratio,
        note: r.area,
      })),
    ],
    regulatedAreas: staticMarket.regulationStatus.regulations.map((r) => ({
      areaType: r.type,
      regions: [r.region],
      designationDate: r.designatedDate,
    })),
    hugAreas: staticMarket.hugStatus.area
      ? [
          {
            region: staticMarket.hugStatus.area.region,
            guaranteeType: "고분양가 관리",
            condition: `기준 분양가 ${staticMarket.hugStatus.area.priceThreshold}만원/3.3㎡`,
          },
        ]
      : [],
    nearbyDevelopmentDetail: [],
    interestRateTrend: [],
    priceIndexTrend:
      apiData.salePriceIndex?.indices.map((idx) => ({
        yearMonth: idx.yearMonth,
        apartmentIndex: idx.index,
        jeonseIndex:
          apiData.rentPriceIndex?.indices.find(
            (ri) => ri.yearMonth === idx.yearMonth
          )?.index || 0,
      })) || [],
  };
}

// ─── 유틸 함수들 ───

/** 시나리오명을 SCR 시나리오 타입으로 매핑 (분양률 기반) */
function mapScenarioName(
  name: string,
  saleRate?: number
): "낙관" | "기본" | "보수" | "비관" {
  // 분양률 기반 자동 분류 (우선)
  if (saleRate !== undefined) {
    if (saleRate >= 1.0) return "기본";
    if (saleRate >= 0.95) return "낙관";
    if (saleRate >= 0.9) return "보수";
    return "비관";
  }
  // 이름 기반 폴백
  if (name.includes("차주") || name === "차주안") return "기본";
  if (name.includes("낙관")) return "낙관";
  if (name.includes("보수")) return "보수";
  if (name.includes("비관")) return "비관";
  return "보수";
}

/** 현재 시점에서 N개월 후의 YYYY-MM 반환 */
function addMonthsToNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 기본 수입 스케줄 생성 (균등 분배 + 분양 시점 가중) */
function buildDefaultRevenueSchedule(
  input: BusinessIncomeInput,
  months: number
) {
  // 수입은 분양 시작(3개월 후)부터 점진적으로 인입
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

/** 기본 지출 스케줄 생성 (토지비 초기, 공사비 균등) */
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
