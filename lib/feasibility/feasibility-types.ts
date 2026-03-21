// ─── 파싱 관련 ───

/** 개별 파일 파싱 결과 */
export interface ParsedDocument {
  filename: string;
  fileType: "pdf" | "docx" | "xlsx" | "hwp";
  fileSize: number;
  extractedData: Record<string, ExtractedValue>;
  rawText: string;
  confidence: number; // 0-100
  pageCount?: number;
}

/** 추출된 수치 */
export interface ExtractedValue {
  key: string; // "planned_sale_price", "total_construction_cost" 등
  value: number;
  unit: string; // "만원/평", "억원", "%" 등
  sourceFile: string;
  page?: number;
  context?: string; // 원문 문맥
}

/** 문서 간 수치 불일치 */
export interface DataConflict {
  field: string;
  fileA: string;
  valueA: number;
  fileB: string;
  valueB: number;
  deviation: number; // 괴리율 (%)
}

/** 사용자 선택으로 확정된 불일치 해결 */
export interface ResolvedConflict {
  field: string;
  selectedFile: string;
  selectedValue: number;
}

/** 병합된 사업 컨텍스트 */
export interface MergedProjectContext {
  projectName: string;
  location: {
    address: string;
    district: string; // 시군구
    dongCode: string; // 법정동 코드
    lat?: number;
    lng?: number;
  };
  scale: {
    totalLandArea: number; // 대지면적 (㎡)
    totalFloorArea: number; // 연면적 (㎡)
    floorAreaRatio: number; // 용적률 (%)
    buildingCoverage: number; // 건폐율 (%)
    floors: { above: number; below: number };
    totalUnits: number; // 총 세대/호실 수
  };
  purpose:
    | "아파트"
    | "오피스텔"
    | "상가"
    | "지식산업센터"
    | "복합"
    | "기타";
  claims: ExtractedValue[];
  conflicts: DataConflict[];
  resolvedConflicts: ResolvedConflict[];
  sourceFiles: ParsedDocument[];
}

// ─── 검증 관련 ───

/** 주장-검증 결과 */
export interface VerificationResult {
  claimKey: string; // "planned_sale_price"
  claimLabel: string; // "분양가"
  claimValue: number;
  claimUnit: string;
  benchmark: {
    value: number;
    source: string; // "MOLIT 실거래가 (2026.01~03)"
    sourceType: "molit" | "kict" | "reb" | "mois" | "internal";
    asOfDate: string; // ISO8601
    comparableCount?: number;
    range?: { min: number; max: number };
  };
  deviation: number; // (claim - benchmark) / benchmark
  deviationPercent: number; // deviation * 100
}

/** 합리성 등급 */
export type RationalityGrade =
  | "APPROPRIATE"
  | "OPTIMISTIC"
  | "UNREALISTIC"
  | "CONSERVATIVE";

export const RATIONALITY_LABELS: Record<RationalityGrade, string> = {
  APPROPRIATE: "적정",
  OPTIMISTIC: "낙관적",
  UNREALISTIC: "비현실적",
  CONSERVATIVE: "보수적",
};

export const RATIONALITY_COLORS: Record<RationalityGrade, string> = {
  APPROPRIATE: "#38a169",
  OPTIMISTIC: "#d69e2e",
  UNREALISTIC: "#e53e3e",
  CONSERVATIVE: "#3182ce",
};

/** 합리성 판정 결과 */
export interface RationalityItem {
  claimKey: string;
  claimLabel: string;
  grade: RationalityGrade;
  deviation: number;
  reasoning: string; // "인근 실거래가 대비 18.4% 높게 책정됨"
  verificationSource: string;
}

// ─── 보고서 관련 ───

/** 장별 검증 의견 */
export interface ChapterOpinion {
  chapterId: string; // "I" ~ "VI"
  title: string; // "사업 개요", "시장 환경" 등
  summary: string;
  dataTable: {
    label: string;
    value: string;
    unit: string;
  }[];
  verificationDetails: {
    claim: string;
    evidence: string;
    grade: RationalityGrade;
    reasoning: string;
  }[];
  overallReview: string; // SCR 스타일 전문 의견 (LLM 생성)
  riskHighlight: boolean; // true면 붉은색 강조
}

/** 사업성 종합 점수 (V-Score 응용) */
export interface FeasibilityScore {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string; // "투자적격" | "조건부적격" | "주의" | "부적격" | "투자불가"
  breakdown: {
    category: string; // "분양가 적정성", "공사비 합리성" 등
    weight: number;
    score: number;
    grade: RationalityGrade;
  }[];
  investmentOpinion: string; // 종합 투자 의견 (LLM 생성)
}

/** 최종 사업성 보고서 */
export interface FeasibilityReport {
  id: string;
  projectContext: MergedProjectContext;
  verificationResults: VerificationResult[];
  rationalityItems: RationalityItem[];
  chapters: ChapterOpinion[];
  vScore: FeasibilityScore;
  metadata: {
    version: string;
    generatedAt: string;
    sourceFiles: string[];
    disclaimer: string;
  };
}

// ─── API 요청/응답 ───

/** Parse API 응답 */
export interface ParseResponse {
  context: MergedProjectContext;
  conflicts: DataConflict[];
  parsedFiles: {
    filename: string;
    fileType: string;
    fileSize: number;
    confidence: number;
    pageCount?: number;
    extractedCount: number;
  }[];
}

/** Verify API 요청 */
export interface VerifyRequest {
  context: MergedProjectContext;
  resolvedConflicts: ResolvedConflict[];
}

/** Verify API 응답 */
export interface VerifyResponse {
  reportId: string | null;
  verifications: VerificationResult[];
  rationalityItems: RationalityItem[];
  chapters: ChapterOpinion[];
  vScore: FeasibilityScore;
}

// ─── 벤치마크 관련 ───

/** 벤치마크 조회 결과 */
export interface BenchmarkValue {
  value: number;
  source: string;
  sourceType: "molit" | "kict" | "reb" | "mois" | "internal";
  asOfDate: string;
  range?: { min: number; max: number };
}

// ─── 주장 패턴 (추출 규칙) ───

export const CLAIM_KEYS = [
  "planned_sale_price",
  "total_construction_cost",
  "construction_cost_per_pyeong",
  "expected_sale_rate",
  "expected_profit_rate",
  "pf_interest_rate",
  "total_project_cost",
  "land_cost",
  "total_land_area",
  "total_floor_area",
  "floor_area_ratio",
  "building_coverage",
  "total_units",
  // 비아파트/복합사업 확장 키
  "total_revenue",
  "rental_income",
  "operation_income",
  "self_capital_ratio",
] as const;

export type ClaimKey = (typeof CLAIM_KEYS)[number];

export const CLAIM_LABELS: Record<ClaimKey, string> = {
  planned_sale_price: "분양가",
  total_construction_cost: "총 공사비",
  construction_cost_per_pyeong: "평당 공사비",
  expected_sale_rate: "예상 분양률",
  expected_profit_rate: "예상 수익률",
  pf_interest_rate: "PF 금리",
  total_project_cost: "총 사업비",
  land_cost: "토지비",
  total_land_area: "대지면적",
  total_floor_area: "연면적",
  floor_area_ratio: "용적률",
  building_coverage: "건폐율",
  total_units: "총 세대수",
  // 비아파트/복합사업 확장
  total_revenue: "총 매출/수익",
  rental_income: "임대 수익",
  operation_income: "운영 수익",
  self_capital_ratio: "자기자본비율",
};
