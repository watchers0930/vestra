/**
 * SCR(Structured Credit Review) 보고서 전체 타입 시스템
 *
 * 기존 feasibility-types.ts 의 ExtractedValue, RationalityGrade, FeasibilityScore 등을 재사용하며,
 * SCR 보고서 I~V장 + 부록(Appendices) 구조를 1:1 매핑합니다.
 */

// ─── 분리 모듈 re-export ───

export type {
  ProjectType,
  TableSource, YearlyRow, MonthlyRow, AreaPrice,
  ScrFrontMatter,
  ScrProjectOverview, ScrProjectSummary, ScrStructureDiagram,
  ScrScheduleItem, ScrSaleTypeRow, ScrPaymentScheduleRow,
  ScrFundingPlan, ScrLandStatusRow,
  ScrDeveloperAnalysis, ScrCompanyOverview, ScrShareholderRow,
  ScrOngoingProjectRow, ScrProfitabilityRow, ScrFinancialStability,
  ScrCashFlowRow,
} from "./scr-types-project";

export type {
  ScrMarketAnalysis, ScrRegulations, ScrDemographics, ScrHousingMarket,
  ScrSupplyItem, ScrUnsoldComplex,
  ScrPriceAdequacy, ScrLocationAnalysis, ScrNearbyDevelopmentRow,
  ScrPriceReview, ScrSalesCase, ScrSupplyCase, ScrPremiumRow,
  ScrAdequacyOpinion,
  ScrRepaymentAnalysis, ScrPeriodSaleRateRow, ScrBusinessIncome,
  ScrCashFlowSummaryRow, ScrFundingScaleRow, ScrScenarioAnalysis,
  ScrBepAnalysis,
  ScrAppendices,
} from "./scr-types-analysis";

// ─── import for ScrReportData ───

import type { ScrFrontMatter, ScrProjectOverview, ScrDeveloperAnalysis } from "./scr-types-project";
import type { ScrMarketAnalysis, ScrPriceAdequacy, ScrRepaymentAnalysis, ScrAppendices } from "./scr-types-analysis";

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

// ─── 메타데이터 ───

export interface ScrMetadata {
  version: string;
  generatedAt: string;
  sourceFiles: string[];
  vScore?: number;
  disclaimer: string;
}

// ─── 타입 가드 ───

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
