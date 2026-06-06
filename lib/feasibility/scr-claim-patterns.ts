/**
 * SCR 클레임 패턴 정의 — 각 ScrClaimKey에 대한 정규식 + 단위 + 후처리
 *
 * @module lib/feasibility/scr-claim-patterns
 */

import type { ScrClaimKey } from "./scr-claim-keys";

// ─── 타입 ───

export interface ScrClaimPattern {
  patterns: RegExp[];
  unit: string;
  captureGroup?: number;
  isText?: boolean;
  postProcess?: (value: number, matchedUnit?: string) => number;
}

// ─── postProcess 헬퍼 (인라인 — 순환참조 방지) ───

function pyeongToSqm(pyeong: number): number {
  return Number((pyeong * 3.305785).toFixed(2));
}

function normalizeToManwon(value: number, unit: string): number {
  if (unit.includes("조")) return value * 1_0000_0000;
  if (unit.includes("억")) return value * 10000;
  if (unit.includes("백만")) return value * 100;
  if (unit.includes("천만")) return value * 1000;
  if (unit === "원") return value / 10000;
  return value;
}

// ─── 패턴 정의 ───

export const SCR_PATTERNS: Partial<Record<ScrClaimKey, ScrClaimPattern>> = {
  // ── I. 사업 개요 ──
  building_name: {
    patterns: [
      /(?:사업명|건물명|단지명|프로젝트명)(?:\s*[:=]\s*|\s+)([^\n,()]+)/,
      /(?:사\s*업\s*명)(?:\s*[:=]\s*|\s+)([^\n,()]+)/,
    ],
    unit: "", isText: true,
  },
  site_address: {
    patterns: [
      /(?:소재지|사업지|위치|사업부지)(?:\s*[:=]\s*|\s+)([^\n]+?(?:시|구|군|동|읍|면|리|로|길)[^\n]*)/,
    ],
    unit: "", isText: true,
  },
  zone_district: {
    patterns: [
      /(?:지구|구역|지구명)(?:\s*[:=]\s*|\s+)([^\n,]+)/,
      /(?:용도지역)(?:\s*[:=]\s*|\s+)([^\n,]+)/,
    ],
    unit: "", isText: true,
  },
  constructor: {
    patterns: [/(?:시공사|시공|건설사)(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/],
    unit: "", isText: true,
  },
  developer: {
    patterns: [/(?:시행사|사업시행자|시행)(?:\s*[:=]\s*|\s+)([^\n,()]+?)(?:\s*\(|$|\n)/],
    unit: "", isText: true,
  },
  total_land_area: {
    patterns: [
      /대지면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)/,
      /(?:토지|부지)\s*면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) => matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  total_floor_area: {
    patterns: [/(?:총\s*)?연면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)/],
    unit: "㎡",
    postProcess: (val, matchedUnit) => matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  building_area: {
    patterns: [/건축면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/],
    unit: "㎡",
    postProcess: (val, matchedUnit) => matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  floor_area_ratio: {
    patterns: [/용적률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/, /용적율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/],
    unit: "%",
  },
  building_coverage: {
    patterns: [/건폐율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/, /건폐률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/],
    unit: "%",
  },
  building_coverage_ratio: {
    patterns: [/건폐율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/],
    unit: "%",
  },
  above_floors: {
    patterns: [/지상\s*([0-9]+)\s*층/, /지상층수(?:\s*[:=]\s*|\s+)([0-9]+)/],
    unit: "층",
  },
  below_floors: {
    patterns: [/지하\s*([0-9]+)\s*층/, /지하층수(?:\s*[:=]\s*|\s+)([0-9]+)/],
    unit: "층",
  },
  building_count: {
    patterns: [/([0-9]+)\s*동\s*규모/, /동수(?:\s*[:=]\s*|\s+)([0-9]+)/, /총\s*([0-9]+)\s*개?\s*동/],
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
    postProcess: (val, matchedUnit) => matchedUnit === "원" ? val / 10000 : val,
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
    patterns: [/기존\s*PF(?:\s*(?:금액|대출))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  new_pf_amount: {
    patterns: [/신규\s*PF(?:\s*(?:금액|대출))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)/],
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
    unit: "", isText: true,
  },
  self_capital_ratio: {
    patterns: [/자기자본\s*비율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/],
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
    postProcess: (val, matchedUnit) => matchedUnit === "원" ? val / 10000 : val,
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
    patterns: [/토지비(?:\s*\(지출\))?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/],
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
    patterns: [/제세공과(?:금)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/],
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
    patterns: [/(?:사업)?수익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%/, /사업\s*이익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%/],
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
    patterns: [/(?:예상|목표|초기)?\s*분양률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/],
    unit: "%",
  },

  // ── 토지 ──
  land_private_area: {
    patterns: [/사유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/],
    unit: "㎡",
    postProcess: (val, matchedUnit) => matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  land_public_area: {
    patterns: [
      /공유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/,
      /국공유지\s*(?:면적)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평)?/,
    ],
    unit: "㎡",
    postProcess: (val, matchedUnit) => matchedUnit === "평" ? pyeongToSqm(val) : val,
  },
  land_private_price: {
    patterns: [/사유지\s*매입(?:가|비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/],
    unit: "만원",
    postProcess: (val, matchedUnit) => normalizeToManwon(val, matchedUnit || "만원"),
  },
  land_public_price: {
    patterns: [/공유지\s*매입(?:가|비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원|백만원)?/],
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
