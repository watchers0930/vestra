/**
 * SCR 보고서용 확장 CLAIM_KEYS
 *
 * 기존 feasibility-types.ts 의 CLAIM_KEYS(18개)를 포함하고,
 * SCR 보고서 I~V장의 핵심 파싱 항목을 45개+로 확장합니다.
 */

import { CLAIM_KEYS, type ClaimKey } from "./feasibility-types";

// ─── SCR 확장 키 (기존 18개 + 신규 29개 = 47개) ───

export const SCR_CLAIM_KEYS = [
  // ── 기존 18개 유지 ──
  ...CLAIM_KEYS,

  // ── I. 사업 개요 확장 ──
  "building_name", // 건물명 / 단지명
  "site_address", // 소재지
  "zone_district", // 지구/구역
  "constructor", // 시공사
  "developer", // 시행사
  "building_area", // 건축면적 (㎡)
  "building_coverage_ratio", // 건폐율 (%)
  "above_floors", // 지상 층수
  "below_floors", // 지하 층수
  "building_count", // 동수
  "construction_period_months", // 공사기간 (개월)

  // ── 타입별 분양가 (JSON 배열) ──
  "sale_type_detail", // [{type, units, exclusiveArea, supplyArea, pricePerPyeong, ...}]

  // ── 자금조달 ──
  "existing_pf_amount", // 기존 PF 금액 (만원)
  "new_pf_amount", // 신규 PF 금액 (만원)
  "pf_total", // PF 합계 (만원)
  "equity_amount", // 자기자본 (만원)
  "pf_interest_rate_existing", // 기존 PF 금리 (%)
  "pf_interest_rate_new", // 신규 PF 금리 (%)
  "pf_maturity", // PF 만기 (개월)
  "trust_company", // 신탁사명

  // ── 사업수지 — 수입 ──
  "revenue_apartment", // 아파트 분양수입 (만원)
  "revenue_officetel", // 오피스텔 분양수입 (만원)
  "revenue_balcony", // 발코니 확장비 (만원)
  "revenue_commercial", // 상가 분양수입 (만원)
  "revenue_interim_interest", // 중도금 이자수입 (만원)
  "revenue_vat", // 부가세 (만원)

  // ── 사업수지 — 지출 ──
  "cost_land", // 토지비 (만원)
  "cost_direct_construction", // 직접공사비 (만원)
  "cost_indirect_construction", // 간접공사비 (만원)
  "cost_sales", // 분양경비 (만원)
  "cost_general_admin", // 일반관리비 (만원)
  "cost_tax", // 제세공과금 (만원)
  "cost_pf_fee", // PF 수수료 (만원)
  "cost_pf_interest", // PF 이자 (만원)
  "cost_interim_interest", // 중도금 이자비용 (만원)
  "profit_before_tax", // 세전이익 (만원)
  "profit_rate", // 수익률 (%)

  // ── 기간별 분양률 (JSON 배열) ──
  "period_sale_rate", // [{period, shortTerm, cumulative}]

  // ── 토지 ──
  "land_private_area", // 사유지 면적 (㎡)
  "land_public_area", // 공유지 면적 (㎡)
  "land_private_price", // 사유지 매입가 (만원)
  "land_public_price", // 공유지 매입가 (만원)
  "land_avg_price_per_pyeong", // 토지 평균 평당가 (만원/평)
] as const;

export type ScrClaimKey = (typeof SCR_CLAIM_KEYS)[number];

// ─── 라벨 매핑 (한글 표시명) ───

/** 기존 CLAIM_LABELS 를 import 하지 않고 전체를 한 객체로 관리 */
export const SCR_CLAIM_LABELS: Record<ScrClaimKey, string> = {
  // 기존 18개
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
  total_revenue: "총 매출/수익",
  rental_income: "임대 수익",
  operation_income: "운영 수익",
  self_capital_ratio: "자기자본비율",
  // (pf_interest_rate 는 기존에 있으므로 위에서 커버)

  // 사업 개요 확장
  building_name: "건물명/단지명",
  site_address: "소재지",
  zone_district: "지구/구역",
  constructor: "시공사",
  developer: "시행사",
  building_area: "건축면적",
  building_coverage_ratio: "건폐율",
  above_floors: "지상 층수",
  below_floors: "지하 층수",
  building_count: "동수",
  construction_period_months: "공사기간(개월)",

  // 타입별 분양가
  sale_type_detail: "타입별 분양가 상세",

  // 자금조달
  existing_pf_amount: "기존 PF 금액",
  new_pf_amount: "신규 PF 금액",
  pf_total: "PF 합계",
  equity_amount: "자기자본",
  pf_interest_rate_existing: "기존 PF 금리",
  pf_interest_rate_new: "신규 PF 금리",
  pf_maturity: "PF 만기(개월)",
  trust_company: "신탁사",

  // 사업수지 — 수입
  revenue_apartment: "아파트 분양수입",
  revenue_officetel: "오피스텔 분양수입",
  revenue_balcony: "발코니 확장비",
  revenue_commercial: "상가 분양수입",
  revenue_interim_interest: "중도금 이자수입",
  revenue_vat: "부가세",

  // 사업수지 — 지출
  cost_land: "토지비(지출)",
  cost_direct_construction: "직접공사비",
  cost_indirect_construction: "간접공사비",
  cost_sales: "분양경비",
  cost_general_admin: "일반관리비",
  cost_tax: "제세공과금",
  cost_pf_fee: "PF 수수료",
  cost_pf_interest: "PF 이자",
  cost_interim_interest: "중도금 이자비용",
  profit_before_tax: "세전이익",
  profit_rate: "수익률",

  // 기간별 분양률
  period_sale_rate: "기간별 분양률",

  // 토지
  land_private_area: "사유지 면적",
  land_public_area: "공유지 면적",
  land_private_price: "사유지 매입가",
  land_public_price: "공유지 매입가",
  land_avg_price_per_pyeong: "토지 평균 평당가",
};

// ─── 유닛(단위) 기본값 ───

export const SCR_CLAIM_UNITS: Record<ScrClaimKey, string> = {
  planned_sale_price: "만원/평",
  total_construction_cost: "만원",
  construction_cost_per_pyeong: "만원/평",
  expected_sale_rate: "%",
  expected_profit_rate: "%",
  pf_interest_rate: "%",
  total_project_cost: "만원",
  land_cost: "만원",
  total_land_area: "㎡",
  total_floor_area: "㎡",
  floor_area_ratio: "%",
  building_coverage: "%",
  total_units: "세대",
  total_revenue: "만원",
  rental_income: "만원",
  operation_income: "만원",
  self_capital_ratio: "%",

  building_name: "",
  site_address: "",
  zone_district: "",
  constructor: "",
  developer: "",
  building_area: "㎡",
  building_coverage_ratio: "%",
  above_floors: "층",
  below_floors: "층",
  building_count: "동",
  construction_period_months: "개월",

  sale_type_detail: "JSON",

  existing_pf_amount: "만원",
  new_pf_amount: "만원",
  pf_total: "만원",
  equity_amount: "만원",
  pf_interest_rate_existing: "%",
  pf_interest_rate_new: "%",
  pf_maturity: "개월",
  trust_company: "",

  revenue_apartment: "만원",
  revenue_officetel: "만원",
  revenue_balcony: "만원",
  revenue_commercial: "만원",
  revenue_interim_interest: "만원",
  revenue_vat: "만원",

  cost_land: "만원",
  cost_direct_construction: "만원",
  cost_indirect_construction: "만원",
  cost_sales: "만원",
  cost_general_admin: "만원",
  cost_tax: "만원",
  cost_pf_fee: "만원",
  cost_pf_interest: "만원",
  cost_interim_interest: "만원",
  profit_before_tax: "만원",
  profit_rate: "%",

  period_sale_rate: "JSON",

  land_private_area: "㎡",
  land_public_area: "㎡",
  land_private_price: "만원",
  land_public_price: "만원",
  land_avg_price_per_pyeong: "만원/평",
};

// ─── 카테고리 그룹핑 (UI 섹션용) ───

export const SCR_CLAIM_CATEGORIES = {
  사업개요: [
    "building_name",
    "site_address",
    "zone_district",
    "constructor",
    "developer",
    "total_land_area",
    "total_floor_area",
    "building_area",
    "floor_area_ratio",
    "building_coverage",
    "building_coverage_ratio",
    "above_floors",
    "below_floors",
    "building_count",
    "total_units",
    "construction_period_months",
  ],
  분양가: [
    "planned_sale_price",
    "sale_type_detail",
    "total_revenue",
  ],
  자금조달: [
    "existing_pf_amount",
    "new_pf_amount",
    "pf_total",
    "equity_amount",
    "pf_interest_rate",
    "pf_interest_rate_existing",
    "pf_interest_rate_new",
    "pf_maturity",
    "trust_company",
    "self_capital_ratio",
  ],
  공사비: [
    "total_construction_cost",
    "construction_cost_per_pyeong",
    "total_project_cost",
  ],
  사업수지_수입: [
    "revenue_apartment",
    "revenue_officetel",
    "revenue_balcony",
    "revenue_commercial",
    "revenue_interim_interest",
    "revenue_vat",
  ],
  사업수지_지출: [
    "cost_land",
    "cost_direct_construction",
    "cost_indirect_construction",
    "cost_sales",
    "cost_general_admin",
    "cost_tax",
    "cost_pf_fee",
    "cost_pf_interest",
    "cost_interim_interest",
  ],
  수익성: [
    "profit_before_tax",
    "profit_rate",
    "expected_profit_rate",
    "expected_sale_rate",
    "period_sale_rate",
  ],
  토지: [
    "land_cost",
    "land_private_area",
    "land_public_area",
    "land_private_price",
    "land_public_price",
    "land_avg_price_per_pyeong",
  ],
  운영수익: [
    "rental_income",
    "operation_income",
  ],
} as const satisfies Record<string, readonly ScrClaimKey[]>;

export type ScrClaimCategory = keyof typeof SCR_CLAIM_CATEGORIES;
