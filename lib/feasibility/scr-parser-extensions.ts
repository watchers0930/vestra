/**
 * SCR 보고서 확장 파싱 엔진
 *
 * 기존 document-parser.ts의 18개 키를 47개로 확장하여
 * SCR PDF 텍스트에서 사업개요, 분양가, 자금조달, 사업수지, 토지 등
 * 전체 항목을 정규식 패턴 매칭으로 추출합니다.
 *
 * @module lib/feasibility/scr-parser-extensions
 */

import type { ExtractedValue } from "./feasibility-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import { SCR_CLAIM_KEYS, SCR_CLAIM_UNITS, SCR_CLAIM_CATEGORIES } from "./scr-claim-keys";

// ─── 파싱 결과 타입 ───

/** SCR 파싱 전체 결과 */
export interface ScrParsedData {
  /** 추출된 항목 (키 → ExtractedValue) */
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>;
  /** 섹션별 그룹핑 결과 */
  sections: ScrSectionGroup;
  /** 파싱 신뢰도 (0~100) */
  confidence: number;
  /** 추출 통계 */
  stats: {
    totalKeys: number;
    extractedKeys: number;
    extractionRate: number; // %
  };
}

/** 섹션별 그룹핑 */
export interface ScrSectionGroup {
  사업개요: Partial<Record<ScrClaimKey, ExtractedValue>>;
  분양가: Partial<Record<ScrClaimKey, ExtractedValue>>;
  자금조달: Partial<Record<ScrClaimKey, ExtractedValue>>;
  공사비: Partial<Record<ScrClaimKey, ExtractedValue>>;
  사업수지_수입: Partial<Record<ScrClaimKey, ExtractedValue>>;
  사업수지_지출: Partial<Record<ScrClaimKey, ExtractedValue>>;
  수익성: Partial<Record<ScrClaimKey, ExtractedValue>>;
  토지: Partial<Record<ScrClaimKey, ExtractedValue>>;
  운영수익: Partial<Record<ScrClaimKey, ExtractedValue>>;
}

// ─── 숫자 추출 유틸리티 ───

/** 쉼표·공백 제거 후 숫자 파싱 */
function parseNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** 한국어 금액 단위를 만원 기준으로 변환 */
function normalizeToManwon(value: number, unit: string): number {
  if (unit.includes("조")) {
    // "1조 2,345억원" 같은 패턴은 별도 처리
    return value * 1_0000_0000; // 1조 = 1억 만원
  }
  if (unit.includes("억")) {
    return value * 10000; // 1억 = 10000만원
  }
  if (unit.includes("백만")) {
    return value * 100; // 1백만원 = 100만원
  }
  if (unit.includes("천만")) {
    return value * 1000;
  }
  if (unit === "원") {
    return value / 10000;
  }
  // 만원 또는 단위 없음
  return value;
}

/** 복합 금액 패턴 파싱: "1조 2,345억원", "123,456백만원" 등 */
function parseComplexAmount(text: string): { value: number; unit: string } | null {
  // 패턴 1: "N조 N억원" 또는 "N조N억원"
  const joMatch = text.match(/([0-9,.]+)\s*조\s*([0-9,.]+)?\s*억?\s*원?/);
  if (joMatch) {
    const jo = parseNumber(joMatch[1]);
    const eok = joMatch[2] ? parseNumber(joMatch[2]) : 0;
    return { value: jo * 1_0000_0000 + eok * 10000, unit: "만원" };
  }

  // 패턴 2: "N억N천만원"
  const eokCheonMatch = text.match(/([0-9,.]+)\s*억\s*([0-9,.]+)?\s*천만?\s*원?/);
  if (eokCheonMatch) {
    const eok = parseNumber(eokCheonMatch[1]);
    const cheon = eokCheonMatch[2] ? parseNumber(eokCheonMatch[2]) : 0;
    return { value: eok * 10000 + cheon * 1000, unit: "만원" };
  }

  // 패턴 3: 일반 금액 + 단위
  const generalMatch = text.match(/([0-9,.]+)\s*(조원|억원|백만원|천만원|만원|원)/);
  if (generalMatch) {
    const val = parseNumber(generalMatch[1]);
    return { value: normalizeToManwon(val, generalMatch[2]), unit: "만원" };
  }

  return null;
}

/** 면적 변환: 평 → ㎡ */
function pyeongToSqm(pyeong: number): number {
  return Number((pyeong * 3.305785).toFixed(2));
}

// ─── 텍스트 정규화 ───

/** SCR 텍스트 전처리 (공백/특수문자 정규화) */
function normalizeScrText(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, " ")           // non-breaking space
    .replace(/[：﹕]/g, ":")            // 전각 콜론
    .replace(/[‐‑‒–—]/g, "-")         // 다양한 하이픈
    .replace(/\r\n/g, "\n")            // 개행 통일
    .replace(/\t+/g, "\t")             // 탭 정규화
    // 떨어진 한글 정규화 (PDF에서 글자 사이 공백이 생기는 경우)
    .replace(/사\s*업\s*명/g, "사업명")
    .replace(/소\s*재\s*지/g, "소재지")
    .replace(/시\s*공\s*사/g, "시공사")
    .replace(/시\s*행\s*사/g, "시행사")
    .replace(/신\s*탁\s*사/g, "신탁사")
    .replace(/건\s*폐\s*율/g, "건폐율")
    .replace(/용\s*적\s*률/g, "용적률")
    .replace(/대\s*지\s*면\s*적/g, "대지면적")
    .replace(/연\s*면\s*적/g, "연면적")
    .replace(/건\s*축\s*면\s*적/g, "건축면적")
    .replace(/세\s*대\s*수/g, "세대수")
    .replace(/공\s*사\s*기\s*간/g, "공사기간")
    .replace(/분\s*양\s*가/g, "분양가")
    .replace(/토\s*지\s*비/g, "토지비")
    .replace(/공\s*사\s*비/g, "공사비")
    .replace(/수\s*익\s*률/g, "수익률")
    .trim();
}

// ─── 표 구조 파싱 ───

/** 탭/공백 구분 테이블 행 파싱 */
function parseTableRow(line: string): string[] {
  // 탭 구분 우선
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim()).filter(Boolean);
  }
  // 2개 이상 연속 공백으로 구분
  return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

/** 텍스트에서 "라벨: 값" 패턴 추출 */
function extractLabelValue(
  text: string,
  labelPattern: RegExp
): string | null {
  const match = text.match(labelPattern);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

// ─── 패턴 정의 ───

interface ScrClaimPattern {
  /** 정규식 패턴 (여러 변형) */
  patterns: RegExp[];
  /** 결과 단위 */
  unit: string;
  /** 숫자 캡처 그룹 인덱스 (기본 1) */
  captureGroup?: number;
  /** 텍스트(문자열) 결과인지 여부 (기본 false) */
  isText?: boolean;
  /** 후처리 함수 */
  postProcess?: (value: number, matchedUnit?: string) => number;
}

const SCR_PATTERNS: Partial<Record<ScrClaimKey, ScrClaimPattern>> = {
  // ── I. 사업 개요 ──

  building_name: {
    patterns: [
      /(?:사업명|건물명|단지명|프로젝트명)(?:\s*[:=]\s*|\s+)([^\n,()]+)/,
      /(?:사\s*업\s*명)(?:\s*[:=]\s*|\s+)([^\n,()]+)/,
    ],
    unit: "",
    isText: true,
  },
  site_address: {
    patterns: [
      /(?:소재지|사업지|위치|사업부지)(?:\s*[:=]\s*|\s+)([^\n]+?(?:시|구|군|동|읍|면|리|로|길)[^\n]*)/,
    ],
    unit: "",
    isText: true,
  },
  zone_district: {
    patterns: [
      /(?:지구|구역|지구명)(?:\s*[:=]\s*|\s+)([^\n,]+)/,
      /(?:용도지역)(?:\s*[:=]\s*|\s+)([^\n,]+)/,
    ],
    unit: "",
    isText: true,
  },
  constructor: {
    patterns: [
      /(?:시공사|시공|건설사)(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/,
    ],
    unit: "",
    isText: true,
  },
  developer: {
    patterns: [
      /(?:시행사|사업시행자|시행)(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/,
    ],
    unit: "",
    isText: true,
  },
  total_land_area: {
    patterns: [
      /대지면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)/,
      /(?:토지|부지)\s*면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  total_floor_area: {
    patterns: [
      /(?:총\s*)?연면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  building_area: {
    patterns: [
      /건축면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  floor_area_ratio: {
    patterns: [
      /용적률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /용적율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  building_coverage: {
    patterns: [
      /건폐율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /건폐률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  building_coverage_ratio: {
    patterns: [
      /건폐율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  above_floors: {
    patterns: [
      /지상\s*([0-9]+)\s*층/,
      /지상층수(?:\s*[:=]\s*|\s+)([0-9]+)/,
    ],
    unit: "층",
  },
  below_floors: {
    patterns: [
      /지하\s*([0-9]+)\s*층/,
      /지하층수(?:\s*[:=]\s*|\s+)([0-9]+)/,
    ],
    unit: "층",
  },
  building_count: {
    patterns: [
      /([0-9]+)\s*동\s*규모/,
      /동수(?:\s*[:=]\s*|\s+)([0-9]+)/,
      /총\s*([0-9]+)\s*개?\s*동/,
    ],
    unit: "동",
  },
  total_units: {
    patterns: [
      /총\s*세대(?:수)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(세대|호실|실|호)?/,
      /총\s*호실(?:수)?(?:\s*[:=]\s*|\s+)([0-9,.]+)/,
      /세대수(?:\s*[:=]\s*|\s+)([0-9,.]+)/,
      /([0-9,.]+)\s*세대\s*규모/,
    ],
    unit: "세대",
  },
  construction_period_months: {
    patterns: [
      /공사기간(?:\s*[:=]\s*|\s+)(?:약\s*)?([0-9]+)\s*개?월/,
      /사업기간(?:\s*[:=]\s*|\s+)(?:약\s*)?([0-9]+)\s*개?월/,
    ],
    unit: "개월",
  },

  // ── 분양가 ──

  planned_sale_price: {
    patterns: [
      /(?:예상|계획|목표)?\s*분양가(?:격)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)/,
      /분양\s*단가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /평당\s*분양가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
    ],
    unit: "만원/평",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "원" ? val / 10000 : val,
  },
  total_revenue: {
    patterns: [
      /(?:총\s*)?분양수입(?:\s*합계)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/,
      /수입\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },

  // ── 자금조달 ──

  existing_pf_amount: {
    patterns: [
      /기존\s*PF(?:\s*(?:금액|대출))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  new_pf_amount: {
    patterns: [
      /신규\s*PF(?:\s*(?:금액|대출))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  pf_total: {
    patterns: [
      /PF\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/,
      /PF\s*대출\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /PF대출금액(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /PF\s*대출\s*금액(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  equity_amount: {
    patterns: [
      /자기자본(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/,
      /자본금(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  pf_interest_rate: {
    patterns: [
      /PF\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /PF\s*조달\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /대출\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  pf_interest_rate_existing: {
    patterns: [
      /기존\s*PF\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /기존\s*(?:대출\s*)?금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  pf_interest_rate_new: {
    patterns: [
      /신규\s*PF\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /신규\s*(?:대출\s*)?금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  pf_maturity: {
    patterns: [
      /PF\s*만기(?:\s*[:=]\s*|\s+)(?:약\s*)?([0-9]+)\s*개?월/,
      /대출\s*만기(?:\s*[:=]\s*|\s+)(?:약\s*)?([0-9]+)\s*개?월/,
    ],
    unit: "개월",
  },
  trust_company: {
    patterns: [
      /신탁사(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/,
      /(?:관리|토지)?\s*신탁(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/,
    ],
    unit: "",
    isText: true,
  },
  self_capital_ratio: {
    patterns: [
      /자기자본\s*비율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },

  // ── 공사비 ──

  total_construction_cost: {
    patterns: [
      /총\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /공사비\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /공사비\s*총액(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  construction_cost_per_pyeong: {
    patterns: [
      /평당\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /공사비\s*단가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
    ],
    unit: "만원/평",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "원" ? val / 10000 : val,
  },
  total_project_cost: {
    patterns: [
      /총\s*사업비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /사업비\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },

  // ── 사업수지 — 수입 ──

  revenue_apartment: {
    patterns: [
      /아파트\s*(?:분양)?수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /아파트\s*분양(?:대금|수입)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  revenue_officetel: {
    patterns: [
      /오피스텔\s*(?:분양)?수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /오피스텔\s*분양(?:대금|수입)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  revenue_balcony: {
    patterns: [
      /발코니\s*(?:확장)?(?:비|수입)(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /발코니\s*확장\s*(?:수입|대금)(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  revenue_commercial: {
    patterns: [
      /상가\s*(?:분양)?수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /상업시설\s*(?:분양)?수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /근린생활\s*수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  revenue_interim_interest: {
    patterns: [
      /중도금\s*이자\s*수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /이자\s*수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  revenue_vat: {
    patterns: [
      /부가(?:가치)?세\s*(?:수입)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /VAT(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },

  // ── 사업수지 — 지출 ──

  land_cost: {
    patterns: [
      /토지비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /토지\s*매입(?:비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /용지비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_land: {
    patterns: [
      /토지비(?:\s*\(지출\))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_direct_construction: {
    patterns: [
      /직접\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /직접공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_indirect_construction: {
    patterns: [
      /간접\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /간접공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_sales: {
    patterns: [
      /분양경비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /분양\s*관련\s*경비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_general_admin: {
    patterns: [
      /일반관리비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /일반\s*관리비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_tax: {
    patterns: [
      /제세공과(?:금)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_pf_fee: {
    patterns: [
      /PF\s*수수료(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /금융\s*수수료(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_pf_interest: {
    patterns: [
      /PF\s*이자(?:\s*(?:비용)?)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /PF이자(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  cost_interim_interest: {
    patterns: [
      /중도금\s*이자\s*비용(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /중도금\s*이자(?:\s*지출)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },

  // ── 수익성 ──

  profit_before_tax: {
    patterns: [
      /세전\s*(?:사업)?이익(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /사업\s*이익(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  profit_rate: {
    patterns: [
      /(?:사업)?수익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%/,
      /사업\s*이익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%/,
    ],
    unit: "%",
  },
  expected_profit_rate: {
    patterns: [
      /(?:예상|목표|투자)\s*수익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /IRR(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /ROI(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  expected_sale_rate: {
    patterns: [
      /(?:예상|목표|초기)?\s*분양률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },

  // ── 토지 ──

  land_private_area: {
    patterns: [
      /사유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  land_public_area: {
    patterns: [
      /공유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/,
      /국공유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) =>
      matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  land_private_price: {
    patterns: [
      /사유지\s*매입(?:가|비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  land_public_price: {
    patterns: [
      /공유지\s*매입(?:가|비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  land_avg_price_per_pyeong: {
    patterns: [
      /(?:토지\s*)?(?:평균\s*)?평당(?:가|단가|매입가)(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원)?/,
      /토지\s*평당가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원)?/,
    ],
    unit: "만원/평",
  },

  // ── 운영수익 ──

  rental_income: {
    patterns: [
      /임대\s*수익(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /임대료\s*수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  operation_income: {
    patterns: [
      /운영\s*수익(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
      /관리비\s*수입(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/,
    ],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
};

// ─── 사업수지 표 전용 파서 ───

/** 사업수지 표에서 수입/지출 항목을 일괄 추출 */
function parseBusinessIncomeTable(
  text: string,
  sourceFile: string
): Partial<Record<ScrClaimKey, ExtractedValue>> {
  const result: Partial<Record<ScrClaimKey, ExtractedValue>> = {};

  // 수입 항목 매핑 (표의 라벨 → ScrClaimKey)
  const revenueMapping: [RegExp, ScrClaimKey][] = [
    [/아파트\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_apartment"],
    [/오피스텔\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_officetel"],
    [/발코니\s*(?:확장)?(?:비|수입)\s+([0-9,.]+)/, "revenue_balcony"],
    [/상가\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_commercial"],
    [/중도금\s*이자\s*(?:수입)?\s+([0-9,.]+)/, "revenue_interim_interest"],
    [/부가(?:가치)?세\s+([0-9,.]+)/, "revenue_vat"],
  ];

  // 지출 항목 매핑
  const costMapping: [RegExp, ScrClaimKey][] = [
    [/토지비\s+([0-9,.]+)/, "cost_land"],
    [/직접\s*공사비\s+([0-9,.]+)/, "cost_direct_construction"],
    [/간접\s*공사비\s+([0-9,.]+)/, "cost_indirect_construction"],
    [/분양경비\s+([0-9,.]+)/, "cost_sales"],
    [/일반\s*관리비\s+([0-9,.]+)/, "cost_general_admin"],
    [/제세공과(?:금)?\s+([0-9,.]+)/, "cost_tax"],
    [/PF\s*수수료\s+([0-9,.]+)/, "cost_pf_fee"],
    [/PF\s*이자\s+([0-9,.]+)/, "cost_pf_interest"],
    [/중도금\s*이자\s*(?:비용)?\s+([0-9,.]+)/, "cost_interim_interest"],
  ];

  // 수익성 항목
  const profitMapping: [RegExp, ScrClaimKey][] = [
    [/세전\s*(?:사업)?이익\s+([0-9,.]+)/, "profit_before_tax"],
    [/(?:사업)?수익률\s+([0-9,.]+)\s*%/, "profit_rate"],
  ];

  const allMappings = [...revenueMapping, ...costMapping, ...profitMapping];

  for (const [pattern, key] of allMappings) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rawValue = parseNumber(match[1]);
      if (rawValue > 0) {
        const unit = SCR_CLAIM_UNITS[key];
        // 사업수지 표의 숫자는 보통 만원 단위
        const contextStart = Math.max(0, text.indexOf(match[0]) - 20);
        const contextEnd = Math.min(text.length, text.indexOf(match[0]) + match[0].length + 20);
        const context = text.slice(contextStart, contextEnd).trim();

        result[key] = {
          key,
          value: unit === "%" ? rawValue : rawValue,
          unit,
          sourceFile,
          context,
        };
      }
    }
  }

  return result;
}

// ─── 타입별 분양가 상세 파서 ───

/** 타입별 분양가 표 파싱 (sale_type_detail) */
function parseSaleTypeDetail(
  text: string,
  sourceFile: string
): ExtractedValue | null {
  // 타입별 분양가 표 패턴: "59A  120  59.99  84.95  2,350  ..."
  const typeRows: {
    type: string;
    units: number;
    exclusiveArea: number;
    supplyArea: number;
    pricePerPyeong: number;
  }[] = [];

  // 타입 패턴: 숫자 + 알파벳 (예: 59A, 84B, 117C)
  const typePattern = /(\d{2,3}[A-Z]?)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = typePattern.exec(text)) !== null) {
    const type = match[1];
    const units = parseNumber(match[2]);
    const exclusiveArea = parseNumber(match[3]);
    const supplyArea = parseNumber(match[4]);
    const pricePerPyeong = parseNumber(match[5]);

    if (units > 0 && exclusiveArea > 0) {
      typeRows.push({ type, units, exclusiveArea, supplyArea, pricePerPyeong });
    }
  }

  if (typeRows.length === 0) return null;

  return {
    key: "sale_type_detail",
    value: typeRows.length,
    unit: "JSON",
    sourceFile,
    context: JSON.stringify(typeRows),
  };
}

// ─── 기간별 분양률 파서 ───

/** 기간별 분양률 표 파싱 (period_sale_rate) */
function parsePeriodSaleRate(
  text: string,
  sourceFile: string
): ExtractedValue | null {
  const rows: { period: string; shortTerm: number; cumulative: number }[] = [];

  // "분양~3개월  30.0  30.0" 또는 "3~6개월  20.0  50.0" 패턴
  const periodPattern = /((?:분양|착공|입주)?[~\-]?\s*\d+\s*(?:개월|월)(?:\s*[~\-]\s*\d+\s*(?:개월|월))?)\s+([0-9,.]+)\s*%?\s+([0-9,.]+)\s*%?/g;
  let match: RegExpExecArray | null;

  while ((match = periodPattern.exec(text)) !== null) {
    const period = match[1].trim();
    const shortTerm = parseNumber(match[2]);
    const cumulative = parseNumber(match[3]);

    if (shortTerm >= 0 && cumulative >= 0) {
      rows.push({ period, shortTerm, cumulative });
    }
  }

  if (rows.length === 0) return null;

  return {
    key: "period_sale_rate",
    value: rows.length,
    unit: "JSON",
    sourceFile,
    context: JSON.stringify(rows),
  };
}

// ─── 메인 파싱 함수 ───

/**
 * SCR PDF 텍스트에서 47개 항목을 추출하는 메인 함수
 *
 * @param text - PDF에서 추출된 원문 텍스트
 * @param sourceFile - 소스 파일명 (기본값: "scr-report.pdf")
 * @returns ScrParsedData - 파싱 결과
 */
export function parseScrDocument(
  text: string,
  sourceFile = "scr-report.pdf"
): ScrParsedData {
  const normalizedText = normalizeScrText(text);
  const claims: Partial<Record<ScrClaimKey, ExtractedValue>> = {};

  // 1단계: 정규식 패턴 매칭으로 각 키 추출
  for (const [key, patternDef] of Object.entries(SCR_PATTERNS) as [ScrClaimKey, ScrClaimPattern][]) {
    if (!patternDef) continue;
    if (claims[key]) continue; // 이미 추출된 키는 건너뛰기

    const { patterns, unit, isText, postProcess } = patternDef;

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        if (isText) {
          // 텍스트 값 (사업명, 소재지 등)
          const textValue = match[1].trim();
          if (textValue.length > 0) {
            claims[key] = {
              key,
              value: 0, // 텍스트 항목은 value 대신 context 사용
              unit,
              sourceFile,
              context: textValue,
            };
            break;
          }
        } else {
          // 숫자 값
          let value = parseNumber(match[1]);
          if (value > 0) {
            if (postProcess) {
              value = postProcess(value, match[2]);
            }
            // 원문 컨텍스트 추출 (매칭 주변 50자)
            const matchIndex = normalizedText.indexOf(match[0]);
            const contextStart = Math.max(0, matchIndex - 30);
            const contextEnd = Math.min(
              normalizedText.length,
              matchIndex + match[0].length + 30
            );
            const context = normalizedText.slice(contextStart, contextEnd).trim();

            claims[key] = {
              key,
              value: unit === "㎡" ? Number(value.toFixed(2)) : value,
              unit,
              sourceFile,
              context,
            };
            break; // 첫 번째 매칭만 사용
          }
        }
      }
    }
  }

  // 2단계: 사업수지 표 전용 파서로 추가 추출
  const businessIncomeClaims = parseBusinessIncomeTable(normalizedText, sourceFile);
  for (const [key, value] of Object.entries(businessIncomeClaims) as [ScrClaimKey, ExtractedValue][]) {
    if (!claims[key]) {
      claims[key] = value;
    }
  }

  // 3단계: 특수 JSON 항목 추출
  const saleTypeDetail = parseSaleTypeDetail(normalizedText, sourceFile);
  if (saleTypeDetail && !claims.sale_type_detail) {
    claims.sale_type_detail = saleTypeDetail;
  }

  const periodSaleRate = parsePeriodSaleRate(normalizedText, sourceFile);
  if (periodSaleRate && !claims.period_sale_rate) {
    claims.period_sale_rate = periodSaleRate;
  }

  // 4단계: 섹션별 그룹핑
  const sections = groupBySection(claims);

  // 5단계: 신뢰도 계산
  const extractedKeys = Object.keys(claims).length;
  const totalKeys = SCR_CLAIM_KEYS.length;
  const confidence = calculateScrConfidence(claims, normalizedText, extractedKeys, totalKeys);

  return {
    claims,
    sections,
    confidence,
    stats: {
      totalKeys,
      extractedKeys,
      extractionRate: Number(((extractedKeys / totalKeys) * 100).toFixed(1)),
    },
  };
}

// ─── 섹션 그룹핑 ───

/** 추출된 claims를 SCR_CLAIM_CATEGORIES 기준으로 그룹핑 */
function groupBySection(
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>
): ScrSectionGroup {
  const sections: ScrSectionGroup = {
    사업개요: {},
    분양가: {},
    자금조달: {},
    공사비: {},
    사업수지_수입: {},
    사업수지_지출: {},
    수익성: {},
    토지: {},
    운영수익: {},
  };

  for (const [category, keys] of Object.entries(SCR_CLAIM_CATEGORIES) as [keyof ScrSectionGroup, readonly ScrClaimKey[]][]) {
    for (const key of keys) {
      if (claims[key]) {
        sections[category][key] = claims[key];
      }
    }
  }

  return sections;
}

// ─── 신뢰도 계산 ───

/** SCR 파싱 신뢰도 계산 */
function calculateScrConfidence(
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>,
  text: string,
  extractedKeys: number,
  totalKeys: number
): number {
  // 기본 점수: 추출률 기반 (최대 50점)
  let score = (extractedKeys / totalKeys) * 50;

  // 핵심 항목 보너스 (최대 25점) — 이 항목들이 있으면 신뢰도 높음
  const criticalKeys: ScrClaimKey[] = [
    "building_name",
    "total_land_area",
    "total_floor_area",
    "total_units",
    "pf_total",
    "profit_before_tax",
    "profit_rate",
  ];
  const criticalFound = criticalKeys.filter((k) => claims[k]).length;
  score += (criticalFound / criticalKeys.length) * 25;

  // 텍스트 품질 보너스 (최대 15점)
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const koreanRatio = koreanChars / Math.max(1, text.length);
  if (koreanRatio > 0.15) score += 8;
  if (koreanRatio > 0.25) score += 7;

  // 텍스트 길이 보너스 (최대 10점)
  if (text.length > 5000) score += 5;
  if (text.length > 20000) score += 5;

  return Math.min(100, Math.round(score));
}

// ─── 유틸리티 내보내기 ───

/** 외부에서 테스트용으로 사용할 수 있는 유틸 함수들 */
export const scrParserUtils = {
  parseNumber,
  normalizeToManwon,
  parseComplexAmount,
  pyeongToSqm,
  normalizeScrText,
  parseTableRow,
  extractLabelValue,
} as const;
