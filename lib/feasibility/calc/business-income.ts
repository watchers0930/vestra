/**
 * 사업수지 계산기 (Business Income Calculator)
 *
 * SCR 표41 "사업수지_차주안"을 계산합니다.
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/business-income
 */

// ─── 입력 타입 ───

/** 사업수지 계산 입력값 */
export interface BusinessIncomeInput {
  // 분양수입
  revenueApartment: number;        // 아파트 분양수입
  revenueOfficetel: number;        // 오피스텔 분양수입
  revenueBalcony: number;          // 발코니확장비
  revenueCommercial: number;       // 상가 분양수입
  revenueInterimInterest: number;  // 중도금이자후불
  revenueVat: number;              // VAT (음수 가능)

  // 사업비
  costLand: number;                // 토지비
  costDirectConstruction: number;  // 직접공사비
  costIndirectConstruction: number; // 간접공사비
  costSales: number;               // 판매비
  costGeneralAdmin: number;        // 일반부대비용
  costTax: number;                 // 제세공과금
  costPfFee: number;               // PF 수수료
  costPfInterest: number;          // PF 이자
  costInterimInterest: number;     // 중도금대출이자
}

/** 구성비 행 */
export interface BreakdownRow {
  item: string;    // 항목명
  amount: number;  // 금액 (백만원)
  ratio: number;   // 구성비 (%)
}

/** 사업수지 계산 결과 */
export interface BusinessIncomeResult {
  totalRevenue: number;        // 분양수입 합계
  totalCost: number;           // 사업비 합계
  financeCostSubtotal: number; // 금융비용 소계
  profitBeforeTax: number;     // (세전)사업이익
  profitRate: number;          // 이익률 (%)
  breakdown: BreakdownRow[];   // 구성비 내역
}

// ─── 금액 포맷 유틸 ───

/** 음수를 괄호 표기로 변환 (예: -100 → "(100)") */
export function formatNegative(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toLocaleString()})`;
  }
  return value.toLocaleString();
}

// ─── 메인 계산 함수 ───

/**
 * 사업수지를 계산합니다 (SCR 표41)
 *
 * - 분양수입 합계 = 아파트 + 오피스텔 + 발코니 + 상가 + 중도금이자 + VAT
 * - 금융비용 소계 = PF수수료 + PF이자 + 중도금이자
 * - 사업비 합계 = 토지비 + 직접 + 간접 + 판매비 + 부대비용 + 세금 + 금융비용
 * - 이익 = 분양수입 - 사업비
 * - 각 항목 구성비(%) = 항목 / 분양수입 × 100
 */
export function calculateBusinessIncome(
  input: BusinessIncomeInput
): BusinessIncomeResult {
  // 분양수입 합계
  const totalRevenue =
    input.revenueApartment +
    input.revenueOfficetel +
    input.revenueBalcony +
    input.revenueCommercial +
    input.revenueInterimInterest +
    input.revenueVat;

  // 금융비용 소계
  const financeCostSubtotal =
    input.costPfFee +
    input.costPfInterest +
    input.costInterimInterest;

  // 사업비 합계
  const totalCost =
    input.costLand +
    input.costDirectConstruction +
    input.costIndirectConstruction +
    input.costSales +
    input.costGeneralAdmin +
    input.costTax +
    financeCostSubtotal;

  // 세전 사업이익
  const profitBeforeTax = totalRevenue - totalCost;

  // 이익률 (%)
  const profitRate = totalRevenue !== 0
    ? (profitBeforeTax / totalRevenue) * 100
    : 0;

  // 구성비 계산 헬퍼
  const ratio = (amount: number): number =>
    totalRevenue !== 0
      ? Math.round((amount / totalRevenue) * 10000) / 100 // 소수점 2자리
      : 0;

  // 구성비 내역
  const breakdown: BreakdownRow[] = [
    // 수입
    { item: "아파트 분양수입", amount: input.revenueApartment, ratio: ratio(input.revenueApartment) },
    { item: "오피스텔 분양수입", amount: input.revenueOfficetel, ratio: ratio(input.revenueOfficetel) },
    { item: "발코니확장비", amount: input.revenueBalcony, ratio: ratio(input.revenueBalcony) },
    { item: "상가 분양수입", amount: input.revenueCommercial, ratio: ratio(input.revenueCommercial) },
    { item: "중도금이자후불", amount: input.revenueInterimInterest, ratio: ratio(input.revenueInterimInterest) },
    { item: "VAT", amount: input.revenueVat, ratio: ratio(input.revenueVat) },
    { item: "분양수입 합계", amount: totalRevenue, ratio: 100 },
    // 지출
    { item: "토지비", amount: input.costLand, ratio: ratio(input.costLand) },
    { item: "직접공사비", amount: input.costDirectConstruction, ratio: ratio(input.costDirectConstruction) },
    { item: "간접공사비", amount: input.costIndirectConstruction, ratio: ratio(input.costIndirectConstruction) },
    { item: "판매비", amount: input.costSales, ratio: ratio(input.costSales) },
    { item: "일반부대비용", amount: input.costGeneralAdmin, ratio: ratio(input.costGeneralAdmin) },
    { item: "제세공과금", amount: input.costTax, ratio: ratio(input.costTax) },
    { item: "PF 수수료", amount: input.costPfFee, ratio: ratio(input.costPfFee) },
    { item: "PF 이자", amount: input.costPfInterest, ratio: ratio(input.costPfInterest) },
    { item: "중도금대출이자", amount: input.costInterimInterest, ratio: ratio(input.costInterimInterest) },
    { item: "금융비용 소계", amount: financeCostSubtotal, ratio: ratio(financeCostSubtotal) },
    { item: "사업비 합계", amount: totalCost, ratio: ratio(totalCost) },
    // 이익
    { item: "(세전)사업이익", amount: profitBeforeTax, ratio: ratio(profitBeforeTax) },
  ];

  return {
    totalRevenue,
    totalCost,
    financeCostSubtotal,
    profitBeforeTax,
    profitRate: Math.round(profitRate * 100) / 100,
    breakdown,
  };
}
