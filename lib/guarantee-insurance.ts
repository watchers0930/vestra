/**
 * 보증보험 가입가능성 판단 규칙 엔진
 * ─────────────────────────────────────
 * HUG · HF · SGI 3개 기관의 전세보증보험 가입 가능 여부를
 * 공개 조건 기반으로 판단하고 예상 보증료를 계산한다.
 *
 * DB에 관리자 설정 규칙이 있으면 우선 적용, 없으면 기본 상수 fallback.
 */

import { formatKRW } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuaranteeInput {
  deposit: number;
  propertyPrice: number;
  seniorLiens: number;
  propertyType: string;
  isMetro: boolean;
  contractStartDate: string;
  contractEndDate: string;
  hasJeonseLoan: boolean;
}

export type EligibilityStatus = "eligible" | "conditional" | "ineligible";

export interface InsuranceResult {
  provider: "HUG" | "HF" | "SGI";
  providerName: string;
  status: EligibilityStatus;
  reasons: string[];
  solutions: string[];
  estimatedPremium: number;
  premiumRate: number;
  applyUrl: string;
}

export interface GuaranteeInsuranceResult {
  results: InsuranceResult[];
  recommendation: { provider: string; reason: string } | null;
  disclaimer: string;
  checkedAt: string;
}

// ---------------------------------------------------------------------------
// 기관별 규칙 타입
// ---------------------------------------------------------------------------

interface PremiumRates {
  [propertyType: string]: number;
}

interface HUGRules {
  depositLimit: { metro: number; nonMetro: number };
  maxPropertyPrice: number;
  ltvRatio: number;
  minContractMonths: number;
  premiumRates: PremiumRates;
  applyUrl: string;
}

interface HFRules {
  ltvRatio: number;
  minContractMonths: number;
  requiresLoan: boolean;
  premiumRate: number;
  applyUrl: string;
}

interface SGIRules {
  ltvRatio: number;
  minContractMonths: number;
  premiumRates: PremiumRates;
  applyUrl: string;
}

export interface GuaranteeRules {
  HUG: HUGRules;
  HF: HFRules;
  SGI: SGIRules;
}

// ---------------------------------------------------------------------------
// 기본 상수 (DB 미설정 시 fallback) — 2026-03 기준
// ---------------------------------------------------------------------------

export const DEFAULT_GUARANTEE_RULES: GuaranteeRules = {
  HUG: {
    depositLimit: { metro: 700_000_000, nonMetro: 500_000_000 },
    maxPropertyPrice: 1_200_000_000,
    ltvRatio: 0.9,
    minContractMonths: 12,
    premiumRates: {
      "아파트": 0.00115,
      "빌라/다세대": 0.00128,
      "오피스텔": 0.00140,
      "단독주택": 0.00154,
    },
    applyUrl: "https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp",
  },
  HF: {
    ltvRatio: 0.9,
    minContractMonths: 12,
    requiresLoan: true,
    premiumRate: 0.001,
    applyUrl: "https://www.hf.go.kr/ko/sub02/sub02_05_01.do",
  },
  SGI: {
    ltvRatio: 0.9,
    minContractMonths: 12,
    premiumRates: {
      "아파트": 0.00128,
      "빌라/다세대": 0.00154,
      "오피스텔": 0.00168,
      "단독주택": 0.00211,
    },
    applyUrl: "https://www.sgic.co.kr/",
  },
};

// ---------------------------------------------------------------------------
// 유틸 함수
// ---------------------------------------------------------------------------

function diffMonths(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function validateContractPeriod(start: string, end: string): {
  valid: boolean;
  months: number;
  halfPassed: boolean;
} {
  const months = diffMonths(start, end);
  const totalDays = diffDays(start, end);
  const elapsedDays = diffDays(start, new Date().toISOString().slice(0, 10));
  return {
    valid: months >= 12,
    months,
    halfPassed: elapsedDays > totalDays / 2,
  };
}

function checkLTV(deposit: number, seniorLiens: number, propertyPrice: number, ratio: number): boolean {
  return (seniorLiens + deposit) <= propertyPrice * ratio;
}

function calculatePremium(deposit: number, rate: number, start: string, end: string): number {
  const days = diffDays(start, end);
  return Math.round(deposit * rate * (days / 365));
}

// ---------------------------------------------------------------------------
// 개별 기관 판단
// ---------------------------------------------------------------------------

function checkHUG(input: GuaranteeInput, rules: HUGRules): InsuranceResult {
  const reasons: string[] = [];
  const solutions: string[] = [];
  let status: EligibilityStatus = "eligible";

  // 1. 보증금 한도
  const limit = input.isMetro ? rules.depositLimit.metro : rules.depositLimit.nonMetro;
  if (input.deposit > limit) {
    status = "ineligible";
    reasons.push(`보증금 ${formatKRW(input.deposit)}이 한도(${formatKRW(limit)})를 초과합니다`);
    solutions.push("SGI 서울보증은 보증금 한도 제한이 없습니다");
  }

  // 2. 주택가격
  if (input.propertyPrice > rules.maxPropertyPrice) {
    status = "ineligible";
    reasons.push(`주택가격 ${formatKRW(input.propertyPrice)}이 ${formatKRW(rules.maxPropertyPrice)}을 초과합니다`);
  }

  // 3. 담보인정비율
  if (!checkLTV(input.deposit, input.seniorLiens, input.propertyPrice, rules.ltvRatio)) {
    status = "ineligible";
    const maxDeposit = Math.max(0, input.propertyPrice * rules.ltvRatio - input.seniorLiens);
    reasons.push(
      `선순위채권+보증금(${formatKRW(input.seniorLiens + input.deposit)})이 ` +
      `주택가격의 ${rules.ltvRatio * 100}%(${formatKRW(input.propertyPrice * rules.ltvRatio)})를 초과합니다`
    );
    solutions.push(`보증금을 ${formatKRW(maxDeposit)} 이하로 조정하거나 선순위채권을 감축하세요`);
  }

  // 4. 계약기간
  const period = validateContractPeriod(input.contractStartDate, input.contractEndDate);
  if (!period.valid) {
    status = "ineligible";
    reasons.push("계약기간이 1년 미만입니다");
  }
  if (period.halfPassed) {
    status = "ineligible";
    reasons.push("계약기간의 절반이 경과하여 가입 시기를 초과했습니다");
    solutions.push("다음 계약 갱신 시 즉시 가입하세요");
  }

  if (status === "eligible") {
    reasons.push("모든 가입 조건을 충족합니다");
  }

  const rate = rules.premiumRates[input.propertyType] ?? 0.0014;
  const premium = calculatePremium(input.deposit, rate, input.contractStartDate, input.contractEndDate);

  return {
    provider: "HUG",
    providerName: "주택도시보증공사",
    status,
    reasons,
    solutions,
    estimatedPremium: premium,
    premiumRate: rate * 100,
    applyUrl: rules.applyUrl,
  };
}

function checkHF(input: GuaranteeInput, rules: HFRules): InsuranceResult {
  const reasons: string[] = [];
  const solutions: string[] = [];
  let status: EligibilityStatus = "eligible";

  // 1. 전세대출 연계 필수
  if (rules.requiresLoan && !input.hasJeonseLoan) {
    status = "conditional";
    reasons.push("전세자금대출 연계 시 가입 가능합니다");
    solutions.push("전세자금대출을 이용하면 HF 보증을 받을 수 있습니다");
  }

  // 2. 담보인정비율
  if (!checkLTV(input.deposit, input.seniorLiens, input.propertyPrice, rules.ltvRatio)) {
    status = "ineligible";
    reasons.push(
      `선순위채권+보증금이 주택가격의 ${rules.ltvRatio * 100}%를 초과합니다`
    );
  }

  // 3. 계약기간
  const period = validateContractPeriod(input.contractStartDate, input.contractEndDate);
  if (!period.valid) {
    status = "ineligible";
    reasons.push("계약기간이 1년 미만입니다");
  }

  if (status === "eligible") {
    reasons.push("전세대출 연계 조건 포함 모든 조건을 충족합니다");
  }

  const premium = calculatePremium(input.deposit, rules.premiumRate, input.contractStartDate, input.contractEndDate);

  return {
    provider: "HF",
    providerName: "한국주택금융공사",
    status,
    reasons,
    solutions,
    estimatedPremium: premium,
    premiumRate: rules.premiumRate * 100,
    applyUrl: rules.applyUrl,
  };
}

function checkSGI(input: GuaranteeInput, rules: SGIRules): InsuranceResult {
  const reasons: string[] = [];
  const solutions: string[] = [];
  let status: EligibilityStatus = "eligible";

  // 1. 담보인정비율
  if (!checkLTV(input.deposit, input.seniorLiens, input.propertyPrice, rules.ltvRatio)) {
    status = "ineligible";
    const maxDeposit = Math.max(0, input.propertyPrice * rules.ltvRatio - input.seniorLiens);
    reasons.push(
      `선순위채권+보증금이 주택가격의 ${rules.ltvRatio * 100}%를 초과합니다`
    );
    solutions.push(`보증금을 ${formatKRW(maxDeposit)} 이하로 조정하세요`);
  }

  // 2. 계약기간
  const period = validateContractPeriod(input.contractStartDate, input.contractEndDate);
  if (!period.valid) {
    status = "ineligible";
    reasons.push("계약기간이 1년 미만입니다");
  }
  if (period.halfPassed) {
    status = "ineligible";
    reasons.push("계약기간의 절반이 경과했습니다");
  }

  if (status === "eligible") {
    reasons.push("모든 가입 조건을 충족합니다 (보증금 한도 제한 없음)");
  }

  const rate = rules.premiumRates[input.propertyType] ?? 0.00168;
  const premium = calculatePremium(input.deposit, rate, input.contractStartDate, input.contractEndDate);

  return {
    provider: "SGI",
    providerName: "서울보증",
    status,
    reasons,
    solutions,
    estimatedPremium: premium,
    premiumRate: rate * 100,
    applyUrl: rules.applyUrl,
  };
}

// ---------------------------------------------------------------------------
// 추천 로직
// ---------------------------------------------------------------------------

function getRecommendation(results: InsuranceResult[]): { provider: string; reason: string } | null {
  const eligible = results.filter((r) => r.status === "eligible");
  if (eligible.length === 0) return null;

  // 보증료가 가장 저렴한 기관 추천
  eligible.sort((a, b) => a.estimatedPremium - b.estimatedPremium);
  const best = eligible[0];
  return {
    provider: `${best.providerName} (${best.provider})`,
    reason: `예상 보증료 ${formatKRW(best.estimatedPremium)}으로 가장 저렴합니다`,
  };
}

// ---------------------------------------------------------------------------
// 메인 판단 함수
// ---------------------------------------------------------------------------

export function checkGuaranteeInsurance(
  input: GuaranteeInput,
  rules: GuaranteeRules = DEFAULT_GUARANTEE_RULES,
): GuaranteeInsuranceResult {
  const results: InsuranceResult[] = [
    checkHUG(input, rules.HUG),
    checkHF(input, rules.HF),
    checkSGI(input, rules.SGI),
  ];

  return {
    results,
    recommendation: getRecommendation(results),
    disclaimer: "본 판단은 공개된 가입 조건 기반의 참고용 정보이며, 실제 가입 시 각 기관의 심사를 거쳐야 합니다.",
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}
