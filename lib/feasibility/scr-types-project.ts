/**
 * SCR 보고서 타입 — 사업개요 + 사업주체
 *
 * ProjectType, 공통 유틸 타입, I장(사업개요), II장(사업주체 분석)
 *
 * @module lib/feasibility/scr-types-project
 */

// ─── 사업유형 ───

export type ProjectType =
  | "아파트"
  | "주상복합"
  | "오피스텔"
  | "지식산업센터"
  | "재건축"
  | "재개발"
  | "생활형숙박시설";

// ─── 공통 유틸 타입 ───

/** 표(table) 하나의 출처 메타 */
export interface TableSource {
  tableNo: number;
  title: string;
  page?: number;
  sourceFile?: string;
}

/** 연도별 수치 행 */
export interface YearlyRow {
  year: number;
  values: Record<string, number | null>;
}

/** 월별 수치 행 */
export interface MonthlyRow {
  yearMonth: string;
  values: Record<string, number | null>;
}

/** 면적·금액 쌍 */
export interface AreaPrice {
  areaPyeong: number;
  areaSqm: number;
  priceTotal: number;
  pricePerPyeong: number;
}

// ─── 전문부 ───

export interface ScrFrontMatter {
  reportNumber: string;
  projectName: string;
  developer: string;
  analyst: string;
  date: string;
  disclaimer: string;
}

// ─── I. 사업 개요 ───

export interface ScrProjectOverview {
  projectSummary: ScrProjectSummary;
  structureDiagram: ScrStructureDiagram;
  schedule: ScrScheduleItem[];
  salePlan: {
    excludingExpansion: ScrSaleTypeRow[];
    includingExpansion: ScrSaleTypeRow[];
  };
  paymentSchedule: ScrPaymentScheduleRow[];
  fundingPlan: ScrFundingPlan;
  landStatus: ScrLandStatusRow[];
}

export interface ScrProjectSummary {
  projectName: string;
  siteAddress: string;
  zoneDistrict: string;
  constructor: string;
  developer: string;
  totalLandArea: number;
  totalFloorArea: number;
  buildingCoverageRatio: number;
  floorAreaRatio: number;
  aboveFloors: number;
  belowFloors: number;
  buildingCount: number;
  totalUnits: number;
  purpose: ProjectType;
  constructionPeriodMonths: number;
  constructionStart?: string;
  constructionEnd?: string;
}

export interface ScrStructureDiagram {
  buyer: string;
  developer: string;
  lenders: string[];
  trustCompany: string;
  constructor: string;
  description?: string;
}

export interface ScrScheduleItem {
  milestone: string;
  plannedDate: string;
  actualDate?: string;
  status: "완료" | "진행중" | "예정";
}

export interface ScrSaleTypeRow {
  type: string;
  units: number;
  exclusiveArea: number;
  supplyArea: number;
  pricePerExclusivePyeong: number;
  pricePerSupplyPyeong: number;
  pricePerUnit: number;
  totalRevenue: number;
  ratio: number;
}

export interface ScrPaymentScheduleRow {
  stage: string;
  percentage: number;
  dueDate: string;
  amount?: number;
}

export interface ScrFundingPlan {
  existingPfAmount: number;
  newPfAmount: number;
  pfTotal: number;
  equityAmount: number;
  pfInterestRateExisting: number;
  pfInterestRateNew: number;
  pfMaturityMonths: number;
  trustCompany: string;
  lenders: string[];
}

export interface ScrLandStatusRow {
  parcel: string;
  landType: "사유지" | "공유지" | "국공유지";
  area: number;
  pricePerPyeong: number;
  totalPrice: number;
  acquisitionDate?: string;
  note?: string;
}

// ─── II. 사업주체 분석 ───

export interface ScrDeveloperAnalysis {
  companyOverview: ScrCompanyOverview;
  shareholders: ScrShareholderRow[];
  ongoingProjects: ScrOngoingProjectRow[];
  orderBacklog: YearlyRow[];
  profitability: ScrProfitabilityRow[];
  financialStability: ScrFinancialStability;
  cashFlow: ScrCashFlowRow[];
  analysisNarrative?: string;
}

export interface ScrCompanyOverview {
  companyName: string;
  ceoName: string;
  establishedDate: string;
  employeeCount: number;
  mainBusiness: string;
  address: string;
  creditRating?: string;
}

export interface ScrShareholderRow {
  name: string;
  shareCount: number;
  shareRatio: number;
  note?: string;
}

export interface ScrOngoingProjectRow {
  projectName: string;
  location: string;
  totalAmount: number;
  progress: number;
  expectedCompletion: string;
}

export interface ScrProfitabilityRow {
  year: number;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  sgaExpense: number;
  operatingProfit: number;
  ebitda: number;
  nonOperatingIncome: number;
  netIncome: number;
}

export interface ScrFinancialStability {
  balanceSheet: {
    year: number;
    totalAssets: number;
    totalLiabilities: number;
    totalBorrowings: number;
    borrowingDependency: number;
    debtRatio: number;
    equity: number;
  }[];

  liquidity: {
    year: number;
    currentAssets: number;
    currentLiabilities: number;
    currentRatio: number;
    quickRatio: number;
  }[];

  borrowingDetail: {
    lender: string;
    type: string;
    amount: number;
    interestRate: number;
    maturityDate: string;
  }[];
}

export interface ScrCashFlowRow {
  year: number;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  endingBalance: number;
}
