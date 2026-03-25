/**
 * 전세대출 가심사 시뮬레이터
 * ─────────────────────────
 * 7대 은행 전세대출 조건 DB + LTV/DTI 기반 가능성 판단
 * FSS 금융상품 비교 API 연동으로 금리 자동 갱신 (10일 간격)
 */

import { getCachedRates, getBankRateRange } from "./fss-loan-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoanSimulateInput {
  deposit: number;           // 전세 보증금 (원)
  propertyPrice: number;     // 매매 시세 (원)
  propertyType: string;      // 아파트 | 빌라/다세대 | 오피스텔
  propertyAddress: string;
  annualIncome: number;      // 연소득 (원)
  creditScore?: number;      // 신용점수 (없으면 700 기본)
  existingLoans?: number;    // 기존 대출 잔액 (원)
  isFirstHome: boolean;      // 생애최초 여부
}

export interface LoanResult {
  bankName: string;
  productName: string;
  isEligible: boolean;
  maxLoanAmount: number;
  estimatedRate: { min: number; max: number };
  ltv: number;
  dti: number;
  reasons: string[];
  requirements: string[];
}

export interface LoanSimulateResponse {
  results: LoanResult[];
  bestOption: { bankName: string; productName: string; reason: string } | null;
  summary: {
    eligibleCount: number;
    maxAvailable: number;
    lowestRate: number;
  };
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// 7대 은행 전세대출 조건 DB (2026-03 기준)
// ---------------------------------------------------------------------------

interface BankLoanProduct {
  bankName: string;
  productName: string;
  maxLTV: number;
  maxDTI: number;
  maxAmount: number;          // 최대 한도 (원)
  rateRange: { min: number; max: number };
  propertyTypes: string[];
  maxIncome?: number;          // 소득 상한 (원, 초과 시 불가)
  isFirstHomeOnly: boolean;
  minCreditScore: number;
  requirements: string[];
}

const LOAN_PRODUCTS: BankLoanProduct[] = [
  // KB국민
  {
    bankName: "KB국민",
    productName: "KB전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.2, max: 4.1 },
    propertyTypes: ["아파트", "빌라/다세대", "오피스텔"],
    isFirstHomeOnly: false,
    minCreditScore: 600,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  {
    bankName: "KB국민",
    productName: "디딤돌 전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 300_000_000,
    rateRange: { min: 2.1, max: 2.9 },
    propertyTypes: ["아파트", "빌라/다세대"],
    maxIncome: 60_000_000,
    isFirstHomeOnly: true,
    minCreditScore: 0,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본", "무주택확인서"],
  },
  // 신한
  {
    bankName: "신한",
    productName: "신한 전세론",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.3, max: 4.2 },
    propertyTypes: ["아파트", "빌라/다세대", "오피스텔"],
    isFirstHomeOnly: false,
    minCreditScore: 620,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  // 하나
  {
    bankName: "하나",
    productName: "하나 전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.1, max: 4.0 },
    propertyTypes: ["아파트", "빌라/다세대", "오피스텔"],
    isFirstHomeOnly: false,
    minCreditScore: 600,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  // 우리
  {
    bankName: "우리",
    productName: "우리 전세론",
    maxLTV: 0.7,
    maxDTI: 0.55,
    maxAmount: 400_000_000,
    rateRange: { min: 3.4, max: 4.3 },
    propertyTypes: ["아파트", "빌라/다세대"],
    isFirstHomeOnly: false,
    minCreditScore: 650,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  // NH농협
  {
    bankName: "NH농협",
    productName: "NH전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.0, max: 3.9 },
    propertyTypes: ["아파트", "빌라/다세대", "오피스텔"],
    isFirstHomeOnly: false,
    minCreditScore: 600,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  {
    bankName: "NH농협",
    productName: "버팀목 전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 240_000_000,
    rateRange: { min: 1.8, max: 2.4 },
    propertyTypes: ["아파트", "빌라/다세대"],
    maxIncome: 50_000_000,
    isFirstHomeOnly: false,
    minCreditScore: 0,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본", "무주택확인서"],
  },
  // 카카오뱅크
  {
    bankName: "카카오뱅크",
    productName: "카카오뱅크 전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.0, max: 4.0 },
    propertyTypes: ["아파트", "빌라/다세대", "오피스텔"],
    isFirstHomeOnly: false,
    minCreditScore: 600,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
  // 토스뱅크
  {
    bankName: "토스뱅크",
    productName: "토스뱅크 전세대출",
    maxLTV: 0.8,
    maxDTI: 0.6,
    maxAmount: 500_000_000,
    rateRange: { min: 3.1, max: 4.1 },
    propertyTypes: ["아파트", "빌라/다세대"],
    isFirstHomeOnly: false,
    minCreditScore: 600,
    requirements: ["주민등록등본", "소득증빙서류", "전세계약서", "등기부등본"],
  },
];

// ---------------------------------------------------------------------------
// 시뮬레이션 엔진
// ---------------------------------------------------------------------------

function estimateAnnualRepayment(loanAmount: number, rate: number): number {
  if (rate <= 0) return loanAmount / 30; // 0% 금리 시 단순 원금 분할
  const monthlyRate = rate / 100 / 12;
  const months = 360;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return monthlyPayment * 12;
}

function simulateProduct(input: LoanSimulateInput, product: BankLoanProduct): LoanResult {
  const creditScore = input.creditScore || 700;
  const existingLoans = input.existingLoans || 0;
  const reasons: string[] = [];
  let isEligible = true;

  // 물건 유형 체크
  if (!product.propertyTypes.includes(input.propertyType)) {
    isEligible = false;
    reasons.push(`${input.propertyType}은(는) 대상 물건이 아닙니다`);
  }

  // 생애최초 전용 상품
  if (product.isFirstHomeOnly && !input.isFirstHome) {
    isEligible = false;
    reasons.push("생애최초 주택구입자만 신청 가능");
  }

  // 신용점수
  if (creditScore < product.minCreditScore) {
    isEligible = false;
    reasons.push(`신용점수 ${creditScore}점 — 최소 ${product.minCreditScore}점 필요`);
  }

  // 소득 조건 (소득 상한 제한 — 버팀목/디딤돌 등 저소득 우대 상품)
  if (product.maxIncome !== undefined && product.maxIncome > 0 && input.annualIncome > product.maxIncome) {
    isEligible = false;
    reasons.push(`연소득 ${(input.annualIncome / 10000).toLocaleString()}만원 — 소득 상한 ${(product.maxIncome / 10000).toLocaleString()}만원 초과`);
  }

  // LTV 계산
  const ltv = input.deposit / input.propertyPrice;
  if (ltv > product.maxLTV) {
    isEligible = false;
    reasons.push(`LTV ${(ltv * 100).toFixed(1)}% — 한도 ${(product.maxLTV * 100)}% 초과`);
  }

  // 최대 대출 가능액 (LTV 기준)
  const maxByLTV = Math.min(input.propertyPrice * product.maxLTV, input.deposit);
  const maxLoanAmount = Math.min(maxByLTV, product.maxAmount);

  // DTI 계산
  const avgRate = (product.rateRange.min + product.rateRange.max) / 2;
  const annualRepayment = estimateAnnualRepayment(maxLoanAmount, avgRate);
  const existingRepayment = existingLoans > 0 ? estimateAnnualRepayment(existingLoans, 4.5) : 0;
  const dti = input.annualIncome > 0
    ? (annualRepayment + existingRepayment) / input.annualIncome
    : 1;

  if (dti > product.maxDTI) {
    isEligible = false;
    reasons.push(`DTI ${(dti * 100).toFixed(1)}% — 한도 ${(product.maxDTI * 100)}% 초과`);
  }

  if (isEligible && reasons.length === 0) {
    reasons.push("대출 가능 조건 충족");
  }

  return {
    bankName: product.bankName,
    productName: product.productName,
    isEligible,
    maxLoanAmount: isEligible ? maxLoanAmount : 0,
    estimatedRate: product.rateRange,
    ltv: Math.round(ltv * 1000) / 10,
    dti: Math.round(dti * 1000) / 10,
    reasons,
    requirements: product.requirements,
  };
}

// ---------------------------------------------------------------------------
// 메인 함수
// ---------------------------------------------------------------------------

export function simulateLoan(input: LoanSimulateInput): LoanSimulateResponse {
  // FSS 실시간 금리로 상품별 금리 덮어쓰기
  const fssRates = getCachedRates();
  const products = LOAN_PRODUCTS.map((product) => {
    if (fssRates && fssRates.dataSource === "fss") {
      const fssRate = getBankRateRange(fssRates, product.bankName);
      if (fssRate) {
        return { ...product, rateRange: fssRate };
      }
    }
    return product;
  });

  const results = products.map((product) => simulateProduct(input, product));

  const eligible = results.filter((r) => r.isEligible);
  const maxAvailable = eligible.length > 0
    ? Math.max(...eligible.map((r) => r.maxLoanAmount))
    : 0;
  const lowestRate = eligible.length > 0
    ? Math.min(...eligible.map((r) => r.estimatedRate.min))
    : 0;

  // 최적 상품 추천 (금리 최저 우선, 한도 최대 차순)
  let bestOption: LoanSimulateResponse["bestOption"] = null;
  if (eligible.length > 0) {
    const best = [...eligible].sort((a, b) => {
      const rateDiff = a.estimatedRate.min - b.estimatedRate.min;
      if (Math.abs(rateDiff) > 0.2) return rateDiff;
      return b.maxLoanAmount - a.maxLoanAmount;
    })[0];
    bestOption = {
      bankName: best.bankName,
      productName: best.productName,
      reason: `최저 금리 ${best.estimatedRate.min}% + 최대 ${(best.maxLoanAmount / 100_000_000).toFixed(1)}억 한도`,
    };
  }

  return {
    results,
    bestOption,
    summary: {
      eligibleCount: eligible.length,
      maxAvailable,
      lowestRate,
    },
    disclaimer: "본 시뮬레이션은 참고용이며, 실제 대출 심사 결과와 다를 수 있습니다. 정확한 조건은 해당 은행에 문의하세요.",
  };
}

/** 은행별 대출 조건 목록 반환 (필터 가능) */
export function getLoanConditions(propertyType?: string): BankLoanProduct[] {
  if (propertyType) {
    return LOAN_PRODUCTS.filter((p) => p.propertyTypes.includes(propertyType));
  }
  return LOAN_PRODUCTS;
}
