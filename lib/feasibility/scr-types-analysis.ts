/**
 * SCR 보고서 타입 — 시장분석 + 분양가 + 상환 + 부록
 *
 * III장(시장 환경), IV장(분양가 적정성), V장(원리금상환), 부록(Appendices)
 *
 * @module lib/feasibility/scr-types-analysis
 */

import type { MonthlyRow } from "./scr-types-project";

// ─── III. 시장 환경 분석 ───

export interface ScrMarketAnalysis {
  regulations: ScrRegulations;
  demographics: ScrDemographics;
  housingMarket: ScrHousingMarket;
}

export interface ScrRegulations {
  ltvRatio: number;
  dtiRatio: number;
  dsrRatio?: number;
  resaleRestrictionMonths: number;
  subscriptionRestriction: string;
  regulatedAreaType?: string;
  summary: string;
}

export interface ScrDemographics {
  populationHousehold: {
    year: number;
    population: number;
    households: number;
    personsPerHousehold: number;
  }[];

  ageDistribution: {
    ageGroup: string;
    count: number;
    ratio: number;
  }[];

  industryEmployment: {
    industry: string;
    employeeCount: number;
    ratio: number;
  }[];
}

export interface ScrHousingMarket {
  supplyRate: {
    year: number;
    supplyRate: number;
    totalHousing: number;
    apartment: number;
    rowHouse: number;
    detached: number;
    other: number;
  }[];

  transactions: {
    yearMonth: string;
    count: number;
    yoyChange?: number;
  }[];

  housingDistribution: {
    type: string;
    count: number;
    ratio: number;
  }[];

  buildingAge: {
    ageRange: string;
    count: number;
    ratio: number;
  }[];

  supplyByArea: {
    areaRange: string;
    count: number;
    ratio: number;
  }[];

  upcomingSupply: ScrSupplyItem[];
  plannedSupply: ScrSupplyItem[];

  unsoldTrend: {
    yearMonth: string;
    totalUnsold: number;
    afterCompletion: number;
  }[];

  unsoldComplexes: ScrUnsoldComplex[];
}

export interface ScrSupplyItem {
  complexName: string;
  location: string;
  totalUnits: number;
  moveInDate: string;
  developer?: string;
  constructor?: string;
  salePrice?: number;
}

export interface ScrUnsoldComplex {
  complexName: string;
  location: string;
  totalUnits: number;
  unsoldUnits: number;
  unsoldRatio: number;
  completionDate?: string;
}

// ─── IV. 분양가 적정성 검토 ───

export interface ScrPriceAdequacy {
  location: ScrLocationAnalysis;
  nearbyDevelopment: ScrNearbyDevelopmentRow[];
  facilityOverview: string;
  priceReview: ScrPriceReview;
  adequacyOpinion: ScrAdequacyOpinion;
}

export interface ScrLocationAnalysis {
  transportation: {
    item: string;
    distance: string;
    note?: string;
  }[];

  livingInfra: {
    item: string;
    distance: string;
    note?: string;
  }[];

  education: {
    item: string;
    distance: string;
    note?: string;
  }[];

  summary: string;
}

export interface ScrNearbyDevelopmentRow {
  planName: string;
  description: string;
  expectedCompletion?: string;
  impact: "긍정" | "중립" | "부정";
  note?: string;
}

export interface ScrPriceReview {
  regionalTrend: {
    year: number;
    avgMarketPrice: number;
    avgSalePrice: number;
    premiumRate: number;
  }[];

  salesCases: ScrSalesCase[];
  supplyCases: ScrSupplyCase[];
  premiumAnalysis: ScrPremiumRow[];
}

export interface ScrSalesCase {
  complexName: string;
  address: string;
  exclusiveArea: number;
  supplyArea: number;
  transactionDate: string;
  transactionPrice: number;
  pricePerExclusivePyeong: number;
  pricePerSupplyPyeong: number;
  floor: number;
  buildYear: number;
  distanceKm: number;
  note?: string;
}

export interface ScrSupplyCase {
  complexName: string;
  address: string;
  developer: string;
  constructor: string;
  totalUnits: number;
  exclusiveArea: number;
  supplyArea: number;
  saleDate: string;
  salePricePerPyeong: number;
  currentMarketPrice?: number;
  premiumRate?: number;
  saleRate?: number;
  note?: string;
}

export interface ScrPremiumRow {
  complexName: string;
  salePricePerPyeong: number;
  currentPricePerPyeong: number;
  premiumAmount: number;
  premiumRate: number;
}

export interface ScrAdequacyOpinion {
  plannedPrice: {
    type: string;
    pricePerPyeong: number;
    totalPrice: number;
  }[];

  comparison: {
    target: string;
    pricePerPyeong: number;
    gap: number;
    gapRate: number;
  }[];

  conclusion: string;
}

// ─── V. 원리금상환가능성 분석 ───

export interface ScrRepaymentAnalysis {
  assumptions: string;
  periodSaleRate: ScrPeriodSaleRateRow[];
  businessIncome: ScrBusinessIncome;
  cashFlowSummary: ScrCashFlowSummaryRow[];
  fundingScale: ScrFundingScaleRow[];
  monthlyCashFlow: {
    part1: MonthlyRow[];
    part2: MonthlyRow[];
    part3: MonthlyRow[];
  };
  scenario: ScrScenarioAnalysis;
  bep: ScrBepAnalysis;
}

export interface ScrPeriodSaleRateRow {
  period: string;
  shortTermRate: number;
  cumulativeRate: number;
}

export interface ScrBusinessIncome {
  revenue: {
    apartment: number;
    officetel: number;
    balconyExpansion: number;
    commercial: number;
    interimInterest: number;
    vat: number;
    total: number;
  };

  cost: {
    land: number;
    directConstruction: number;
    indirectConstruction: number;
    salesExpense: number;
    generalAdmin: number;
    tax: number;
    pfFee: number;
    pfInterest: number;
    interimInterest: number;
    total: number;
  };

  profitBeforeTax: number;
  profitRate: number;
}

export interface ScrCashFlowSummaryRow {
  item: string;
  amount: number;
  note?: string;
}

export interface ScrFundingScaleRow {
  source: string;
  amount: number;
  ratio: number;
  note?: string;
}

export interface ScrScenarioAnalysis {
  conditions: {
    scenario: "낙관" | "기본" | "보수" | "비관";
    saleRate: number;
    description: string;
  }[];

  projections: {
    scenario: "낙관" | "기본" | "보수" | "비관";
    totalRevenue: number;
    totalCost: number;
    profitBeforeTax: number;
    profitRate: number;
    repaymentPossible: boolean;
  }[];

  sensitivity: {
    variable: string;
    changePercent: number;
    profitImpact: number;
    profitRateImpact: number;
  }[];
}

export interface ScrBepAnalysis {
  pfRepaymentBep: {
    type: string;
    bepSaleRate: number;
    bepUnits: number;
  }[];

  totalCostBep: {
    type: string;
    bepSaleRate: number;
    bepUnits: number;
  }[];

  scenarioBep: {
    scenario: string;
    bepSaleRate: number;
    margin: number;
  }[];
}

// ─── 부록 ───

export interface ScrAppendices {
  policyHistory: {
    date: string;
    policy: string;
    detail: string;
  }[];

  loanRegulations: {
    category: string;
    condition: string;
    ltv: number;
    dti: number;
    note?: string;
  }[];

  regulatedAreas: {
    areaType: string;
    regions: string[];
    designationDate: string;
  }[];

  hugAreas: {
    region: string;
    guaranteeType: string;
    condition?: string;
  }[];

  nearbyDevelopmentDetail: {
    planName: string;
    description: string;
    area?: number;
    budget?: number;
    period?: string;
    status: string;
  }[];

  interestRateTrend: {
    yearMonth: string;
    baseRate: number;
    mortgageRate: number;
  }[];

  priceIndexTrend: {
    yearMonth: string;
    apartmentIndex: number;
    jeonseIndex: number;
    region?: string;
  }[];
}
