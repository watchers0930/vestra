/**
 * SCR(Structured Credit Review) 보고서 전체 타입 시스템
 *
 * 기존 feasibility-types.ts 의 ExtractedValue, RationalityGrade, FeasibilityScore 등을 재사용하며,
 * SCR 보고서 I~V장 + 부록(Appendices) 구조를 1:1 매핑합니다.
 */

import type {
  ExtractedValue,
  RationalityGrade,
  FeasibilityScore,
} from "./feasibility-types";

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
  tableNo: number; // 표 번호 (1~64+)
  title: string; // "사업개요", "주주현황" 등
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
  yearMonth: string; // "2026-01"
  values: Record<string, number | null>;
}

/** 면적·금액 쌍 */
export interface AreaPrice {
  areaPyeong: number;
  areaSqm: number;
  priceTotal: number; // 만원
  pricePerPyeong: number; // 만원/평
}

// ─── SCR 보고서 최상위 ───

/** SCR 보고서 전체 데이터 */
export interface ScrReportData {
  /** 전문부 */
  frontMatter: ScrFrontMatter;

  /** I. 사업 개요 */
  projectOverview: ScrProjectOverview;

  /** II. 사업주체 분석 */
  developerAnalysis: ScrDeveloperAnalysis;

  /** III. 시장 환경 분석 */
  marketAnalysis: ScrMarketAnalysis;

  /** IV. 분양가 적정성 검토 */
  priceAdequacy: ScrPriceAdequacy;

  /** V. 원리금상환가능성 분석 */
  repaymentAnalysis: ScrRepaymentAnalysis;

  /** 부록 */
  appendices: ScrAppendices;

  /** 메타데이터 */
  metadata: ScrMetadata;
}

// ─── 전문부 ───

export interface ScrFrontMatter {
  reportNumber: string; // 보고서 번호
  projectName: string; // 사업명
  developer: string; // 시행사
  analyst: string; // 분석 담당자
  date: string; // ISO8601 발행일
  disclaimer: string; // 면책 문구
}

// ─── I. 사업 개요 ───

export interface ScrProjectOverview {
  /** 표1: 사업개요 */
  projectSummary: ScrProjectSummary;

  /** 수분양자/시행사/대주단/신탁사 관계도 */
  structureDiagram: ScrStructureDiagram;

  /** 표2: 사업일정 */
  schedule: ScrScheduleItem[];

  /** 표3,4: 타입별 분양가 (확장비 구분/포함) */
  salePlan: {
    excludingExpansion: ScrSaleTypeRow[]; // 표3
    includingExpansion: ScrSaleTypeRow[]; // 표4
  };

  /** 표5: 분양대금 납입일정 */
  paymentSchedule: ScrPaymentScheduleRow[];

  /** 표6: 자금조달 (PF/자기자본) */
  fundingPlan: ScrFundingPlan;

  /** 표7: 매입토지 현황 */
  landStatus: ScrLandStatusRow[];
}

export interface ScrProjectSummary {
  projectName: string;
  siteAddress: string;
  zoneDistrict: string; // 지구/구역
  constructor: string; // 시공사
  developer: string; // 시행사
  totalLandArea: number; // 대지면적 (㎡)
  totalFloorArea: number; // 연면적 (㎡)
  buildingCoverageRatio: number; // 건폐율 (%)
  floorAreaRatio: number; // 용적률 (%)
  aboveFloors: number;
  belowFloors: number;
  buildingCount: number; // 동수
  totalUnits: number;
  purpose: ProjectType;
  constructionPeriodMonths: number;
  constructionStart?: string; // ISO8601
  constructionEnd?: string;
}

export interface ScrStructureDiagram {
  buyer: string; // 수분양자
  developer: string; // 시행사
  lenders: string[]; // 대주단
  trustCompany: string; // 신탁사
  constructor: string; // 시공사
  description?: string;
}

export interface ScrScheduleItem {
  milestone: string; // "착공", "분양승인" 등
  plannedDate: string; // ISO8601
  actualDate?: string;
  status: "완료" | "진행중" | "예정";
}

export interface ScrSaleTypeRow {
  type: string; // "59A", "84B" 등
  units: number;
  exclusiveArea: number; // 전용면적 (㎡)
  supplyArea: number; // 공급면적 (㎡)
  pricePerExclusivePyeong: number; // 전용 평당가 (만원)
  pricePerSupplyPyeong: number; // 공급 평당가 (만원)
  pricePerUnit: number; // 세대당 분양가 (만원)
  totalRevenue: number; // 소계 (만원)
  ratio: number; // 구성비 (%)
}

export interface ScrPaymentScheduleRow {
  stage: string; // "계약금", "1차 중도금" 등
  percentage: number; // 납입비율 (%)
  dueDate: string; // ISO8601
  amount?: number; // 만원
}

export interface ScrFundingPlan {
  existingPfAmount: number; // 기존 PF (만원)
  newPfAmount: number; // 신규 PF (만원)
  pfTotal: number;
  equityAmount: number; // 자기자본 (만원)
  pfInterestRateExisting: number; // 기존 PF 금리 (%)
  pfInterestRateNew: number; // 신규 PF 금리 (%)
  pfMaturityMonths: number; // PF 만기 (개월)
  trustCompany: string;
  lenders: string[];
}

export interface ScrLandStatusRow {
  parcel: string; // 지번
  landType: "사유지" | "공유지" | "국공유지";
  area: number; // ㎡
  pricePerPyeong: number; // 만원/평
  totalPrice: number; // 만원
  acquisitionDate?: string;
  note?: string;
}

// ─── II. 사업주체 분석 ───

export interface ScrDeveloperAnalysis {
  /** 표8: 회사개요 */
  companyOverview: ScrCompanyOverview;

  /** 표9: 주주현황 */
  shareholders: ScrShareholderRow[];

  /** 표10: 진행중 공사현장 */
  ongoingProjects: ScrOngoingProjectRow[];

  /** 표11: 수주잔고 추이 */
  orderBacklog: YearlyRow[];

  /** 표12: 수익성 지표 8년 */
  profitability: ScrProfitabilityRow[];

  /** 표13: 재무안정성, 표14: 유동성, 표15: 차입금 현황 */
  financialStability: ScrFinancialStability;

  /** 표16: 현금흐름 6년 */
  cashFlow: ScrCashFlowRow[];
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
  shareRatio: number; // %
  note?: string;
}

export interface ScrOngoingProjectRow {
  projectName: string;
  location: string;
  totalAmount: number; // 도급액 (만원)
  progress: number; // 공정률 (%)
  expectedCompletion: string;
}

export interface ScrProfitabilityRow {
  year: number;
  revenue: number; // 매출
  costOfRevenue: number; // 매출원가
  grossProfit: number; // 매출총이익
  sgaExpense: number; // 판관비
  operatingProfit: number; // 영업이익
  ebitda: number;
  nonOperatingIncome: number; // 영업외수익비용
  netIncome: number; // 당기순이익
}

export interface ScrFinancialStability {
  /** 표13: 재무안정성 */
  balanceSheet: {
    year: number;
    totalAssets: number;
    totalLiabilities: number;
    totalBorrowings: number;
    borrowingDependency: number; // 차입금의존도 (%)
    debtRatio: number; // 부채비율 (%)
    equity: number;
  }[];

  /** 표14: 유동성 */
  liquidity: {
    year: number;
    currentAssets: number;
    currentLiabilities: number;
    currentRatio: number; // 유동비율 (%)
    quickRatio: number; // 당좌비율 (%)
  }[];

  /** 표15: 차입금 현황 */
  borrowingDetail: {
    lender: string;
    type: string; // "장기차입금", "회사채" 등
    amount: number;
    interestRate: number;
    maturityDate: string;
  }[];
}

export interface ScrCashFlowRow {
  year: number;
  operating: number; // 영업활동
  investing: number; // 투자활동
  financing: number; // 재무활동
  netChange: number; // 현금증감
  endingBalance: number; // 기말현금
}

// ─── III. 시장 환경 분석 ───

export interface ScrMarketAnalysis {
  /** 부동산 주요 규제 */
  regulations: ScrRegulations;

  /** 표17~19: 인구·세대·산업 */
  demographics: ScrDemographics;

  /** 표20~29: 주택시장 */
  housingMarket: ScrHousingMarket;
}

export interface ScrRegulations {
  ltvRatio: number; // %
  dtiRatio: number; // %
  dsrRatio?: number; // %
  resaleRestrictionMonths: number;
  subscriptionRestriction: string; // 청약 규제 요약
  regulatedAreaType?: string; // "투기과열지구", "조정대상지역" 등
  summary: string;
}

export interface ScrDemographics {
  /** 표17: 인구수·세대수 */
  populationHousehold: {
    year: number;
    population: number;
    households: number;
    personsPerHousehold: number;
  }[];

  /** 표18: 연령대별 인구 */
  ageDistribution: {
    ageGroup: string; // "20대", "30대" 등
    count: number;
    ratio: number; // %
  }[];

  /** 표19: 산업별 종사자 */
  industryEmployment: {
    industry: string;
    employeeCount: number;
    ratio: number;
  }[];
}

export interface ScrHousingMarket {
  /** 표20: 주택보급률·주택구성 */
  supplyRate: {
    year: number;
    supplyRate: number; // %
    totalHousing: number;
    apartment: number;
    rowHouse: number;
    detached: number;
    other: number;
  }[];

  /** 표21: 주택거래량 */
  transactions: {
    yearMonth: string;
    count: number;
    yoyChange?: number; // 전년 대비 증감률 (%)
  }[];

  /** 표22: 유형별 주택분포 */
  housingDistribution: {
    type: string;
    count: number;
    ratio: number;
  }[];

  /** 표23: 건축연령별 */
  buildingAge: {
    ageRange: string; // "5년 이하", "6~10년" 등
    count: number;
    ratio: number;
  }[];

  /** 표24: 면적별 공급 */
  supplyByArea: {
    areaRange: string; // "60㎡ 이하" 등
    count: number;
    ratio: number;
  }[];

  /** 표25: 입주예정 목록, 표26: 입주예정 단지 */
  upcomingSupply: ScrSupplyItem[];

  /** 표27: 분양예정 단지 */
  plannedSupply: ScrSupplyItem[];

  /** 표28: 미분양 추이 */
  unsoldTrend: {
    yearMonth: string;
    totalUnsold: number;
    afterCompletion: number; // 준공후 미분양
  }[];

  /** 표29: 미분양 단지 */
  unsoldComplexes: ScrUnsoldComplex[];
}

export interface ScrSupplyItem {
  complexName: string;
  location: string;
  totalUnits: number;
  moveInDate: string; // ISO8601
  developer?: string;
  constructor?: string;
  salePrice?: number; // 분양가 (만원/평)
}

export interface ScrUnsoldComplex {
  complexName: string;
  location: string;
  totalUnits: number;
  unsoldUnits: number;
  unsoldRatio: number; // %
  completionDate?: string;
}

// ─── IV. 분양가 적정성 검토 ───

export interface ScrPriceAdequacy {
  /** 표30: 입지여건 */
  location: ScrLocationAnalysis;

  /** 표31: 인근 개발 계획 */
  nearbyDevelopment: ScrNearbyDevelopmentRow[];

  /** 시설개요 및 특성 */
  facilityOverview: string;

  /** 분양가 검토 */
  priceReview: ScrPriceReview;

  /** 적정성 의견 */
  adequacyOpinion: ScrAdequacyOpinion;
}

export interface ScrLocationAnalysis {
  /** 교통 */
  transportation: {
    item: string; // "지하철 O역"
    distance: string; // "도보 5분"
    note?: string;
  }[];

  /** 생활 인프라 */
  livingInfra: {
    item: string;
    distance: string;
    note?: string;
  }[];

  /** 교육 */
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
  /** 표32: 지역 평균 시세 및 분양가 추이 7년 */
  regionalTrend: {
    year: number;
    avgMarketPrice: number; // 평균 시세 (만원/평)
    avgSalePrice: number; // 평균 분양가 (만원/평)
    premiumRate: number; // 프리미엄률 (%)
  }[];

  /** 표33,34: 인근 매매사례 */
  salesCases: ScrSalesCase[];

  /** 표35,36: 인근 분양사례 */
  supplyCases: ScrSupplyCase[];

  /** 표37: 분양사례 프리미엄 */
  premiumAnalysis: ScrPremiumRow[];
}

export interface ScrSalesCase {
  complexName: string;
  address: string;
  exclusiveArea: number; // ㎡
  supplyArea: number; // ㎡
  transactionDate: string;
  transactionPrice: number; // 만원
  pricePerExclusivePyeong: number; // 만원/평
  pricePerSupplyPyeong: number;
  floor: number;
  buildYear: number;
  distanceKm: number; // 본건까지 거리
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
  salePricePerPyeong: number; // 분양가 (만원/평)
  currentMarketPrice?: number; // 현재 시세 (만원/평)
  premiumRate?: number; // 프리미엄률 (%)
  saleRate?: number; // 분양률 (%)
  note?: string;
}

export interface ScrPremiumRow {
  complexName: string;
  salePricePerPyeong: number;
  currentPricePerPyeong: number;
  premiumAmount: number; // 만원/평
  premiumRate: number; // %
}

export interface ScrAdequacyOpinion {
  /** 표38: 본건 계획 분양가 */
  plannedPrice: {
    type: string;
    pricePerPyeong: number; // 만원/평
    totalPrice: number; // 만원
  }[];

  /** 표39: 주요 비교대상 평당가격 */
  comparison: {
    target: string; // 비교대상명
    pricePerPyeong: number;
    gap: number; // 본건 대비 차이 (만원/평)
    gapRate: number; // 차이율 (%)
  }[];

  /** 적정성 종합 의견 */
  conclusion: string;
}

// ─── V. 원리금상환가능성 분석 ───

export interface ScrRepaymentAnalysis {
  /** 전제사항 및 기본 가정 */
  assumptions: string;

  /** 표40: 기간별 분양률 */
  periodSaleRate: ScrPeriodSaleRateRow[];

  /** 표41: 사업수지 */
  businessIncome: ScrBusinessIncome;

  /** 표42: 주요 자금흐름 요약 */
  cashFlowSummary: ScrCashFlowSummaryRow[];

  /** 표43: 자금조달 규모 */
  fundingScale: ScrFundingScaleRow[];

  /** 표44,45,46: 월별 자금수지 3분할 */
  monthlyCashFlow: {
    part1: MonthlyRow[]; // 표44
    part2: MonthlyRow[]; // 표45
    part3: MonthlyRow[]; // 표46
  };

  /** 시나리오 분석 */
  scenario: ScrScenarioAnalysis;

  /** 표50,51,52: BEP 분양률 */
  bep: ScrBepAnalysis;
}

export interface ScrPeriodSaleRateRow {
  period: string; // "분양~3개월" 등
  shortTermRate: number; // 단기 분양률 (%)
  cumulativeRate: number; // 누적 분양률 (%)
}

export interface ScrBusinessIncome {
  /** 수입 항목 */
  revenue: {
    apartment: number;
    officetel: number;
    balconyExpansion: number;
    commercial: number;
    interimInterest: number; // 중도금 이자
    vat: number;
    total: number;
  };

  /** 지출 항목 */
  cost: {
    land: number; // 토지비
    directConstruction: number; // 직접공사비
    indirectConstruction: number; // 간접공사비
    salesExpense: number; // 분양경비
    generalAdmin: number; // 일반관리비
    tax: number; // 제세공과금
    pfFee: number; // PF 수수료
    pfInterest: number; // PF 이자
    interimInterest: number; // 중도금 이자
    total: number;
  };

  /** 세전이익 */
  profitBeforeTax: number;
  profitRate: number; // %
}

export interface ScrCashFlowSummaryRow {
  item: string;
  amount: number;
  note?: string;
}

export interface ScrFundingScaleRow {
  source: string; // "PF 대출", "자기자본" 등
  amount: number;
  ratio: number; // %
  note?: string;
}

export interface ScrScenarioAnalysis {
  /** 표47: 시나리오별 분양률 조건 */
  conditions: {
    scenario: "낙관" | "기본" | "보수" | "비관";
    saleRate: number; // %
    description: string;
  }[];

  /** 표48: 시나리오별 사업수지 */
  projections: {
    scenario: "낙관" | "기본" | "보수" | "비관";
    totalRevenue: number;
    totalCost: number;
    profitBeforeTax: number;
    profitRate: number; // %
    repaymentPossible: boolean;
  }[];

  /** 표49: 민감도 분석 */
  sensitivity: {
    variable: string; // "분양가", "분양률", "공사비" 등
    changePercent: number; // 변동률 (%)
    profitImpact: number; // 이익 변동 (만원)
    profitRateImpact: number; // 이익률 변동 (%p)
  }[];
}

export interface ScrBepAnalysis {
  /** 표50: PF 원리금 상환 BEP */
  pfRepaymentBep: {
    type: string;
    bepSaleRate: number; // BEP 분양률 (%)
    bepUnits: number;
  }[];

  /** 표51: 사업비 전체 BEP */
  totalCostBep: {
    type: string;
    bepSaleRate: number;
    bepUnits: number;
  }[];

  /** 표52: 시나리오별 BEP 요약 */
  scenarioBep: {
    scenario: string;
    bepSaleRate: number;
    margin: number; // 여유율 (%p)
  }[];
}

// ─── 부록 ───

export interface ScrAppendices {
  /** 표53,54: 정책 히스토리 */
  policyHistory: {
    date: string;
    policy: string;
    detail: string;
  }[];

  /** 표55: 대출 규제 */
  loanRegulations: {
    category: string;
    condition: string;
    ltv: number;
    dti: number;
    note?: string;
  }[];

  /** 표56,57,58: 규제지역 */
  regulatedAreas: {
    areaType: string; // "투기과열지구", "조정대상지역" 등
    regions: string[];
    designationDate: string;
  }[];

  /** 표59: HUG 보증 지역 */
  hugAreas: {
    region: string;
    guaranteeType: string;
    condition?: string;
  }[];

  /** 표60~64: 인근 개발 상세 */
  nearbyDevelopmentDetail: {
    planName: string;
    description: string;
    area?: number; // ㎡
    budget?: number; // 만원
    period?: string;
    status: string;
  }[];

  /** 금리 추이 */
  interestRateTrend: {
    yearMonth: string;
    baseRate: number; // 기준금리 (%)
    mortgageRate: number; // 주담대 금리 (%)
  }[];

  /** 부동산 가격지수 추이 */
  priceIndexTrend: {
    yearMonth: string;
    apartmentIndex: number;
    jeonseIndex: number;
    region?: string;
  }[];
}

// ─── 메타데이터 ───

export interface ScrMetadata {
  version: string; // e.g. "1.0.0"
  generatedAt: string; // ISO8601
  sourceFiles: string[];
  vScore?: number; // V-Score (0~100)
  disclaimer: string;
}

// ─── 타입 가드 / 유틸 ───

/** ScrReportData 인지 간이 체크 */
export function isScrReportData(obj: unknown): obj is ScrReportData {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "frontMatter" in obj &&
    "projectOverview" in obj &&
    "metadata" in obj
  );
}

// ─── 문서 수집 슬롯 시스템 ───

/** SCR 보고서 생성에 필요한 문서 카테고리 */
export type ScrDocumentCategory =
  | "business-plan"
  | "pricing-detail"
  | "business-income"
  | "funding-plan"
  | "appraisal"
  | "market-research"
  | "other";

/** 문서 슬롯 정의 */
export interface ScrDocumentSlot {
  category: ScrDocumentCategory;
  label: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
  extractionHint: string;
  icon: string;
}

/** 카테고리별 파일 */
export interface ScrCategorizedFile {
  category: ScrDocumentCategory;
  file: File;
}

/** 7개 문서 슬롯 정의 */
export const DOCUMENT_SLOTS: ScrDocumentSlot[] = [
  {
    category: "business-plan",
    label: "사업계획서",
    description: "사업개요, 사업구조, 공정일정, 시행사/시공사 정보",
    required: true,
    acceptedFormats: [".pdf", ".hwp", ".hwpx", ".docx"],
    extractionHint: "사업명, 소재지, 면적, 세대수, 층수, 공사기간 등을 추출합니다",
    icon: "FileText",
  },
  {
    category: "pricing-detail",
    label: "분양가 산출내역서",
    description: "타입별 분양가, 발코니확장비, 분양대금 납입일정",
    required: true,
    acceptedFormats: [".pdf", ".xlsx", ".xls", ".hwp"],
    extractionHint: "평형별 분양단가, 총분양수입, 납입스케줄을 추출합니다",
    icon: "Calculator",
  },
  {
    category: "business-income",
    label: "사업수지표",
    description: "수입/지출 항목별 금액, 사업비 구성비",
    required: true,
    acceptedFormats: [".xlsx", ".xls", ".pdf"],
    extractionHint: "토지비~제세공과금 16개 항목, 사업이익률을 추출합니다",
    icon: "BarChart3",
  },
  {
    category: "funding-plan",
    label: "자금조달 계획서",
    description: "PF대출 조건, 자기자본 출자, 신탁 구조",
    required: true,
    acceptedFormats: [".pdf", ".hwp", ".hwpx", ".docx"],
    extractionHint: "PF금액/이율/만기, 시행사출자금, 신용보강을 추출합니다",
    icon: "Landmark",
  },
  {
    category: "appraisal",
    label: "감정평가서 / 토지 서류",
    description: "토지면적, 감정가, 등기 현황, 소유권 정보",
    required: false,
    acceptedFormats: [".pdf"],
    extractionHint: "토지단가, 매입금액, 소유현황을 추출합니다",
    icon: "MapPin",
  },
  {
    category: "market-research",
    label: "시장조사 보고서",
    description: "주변시세, 경쟁단지 분석, 인구/세대 현황",
    required: false,
    acceptedFormats: [".pdf", ".docx", ".hwp"],
    extractionHint: "매매사례, 분양사례, 프리미엄율을 추출합니다",
    icon: "TrendingUp",
  },
  {
    category: "other",
    label: "기타 참고자료",
    description: "인허가 서류, 설계도면, 사전확약서 등",
    required: false,
    acceptedFormats: [".pdf", ".docx", ".xlsx", ".hwp", ".hwpx", ".jpg", ".png"],
    extractionHint: "부가 정보를 추출하여 보고서 정확도를 높입니다",
    icon: "Paperclip",
  },
];
