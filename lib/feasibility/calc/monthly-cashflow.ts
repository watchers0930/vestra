/**
 * 월별 자금수지 생성기 (Monthly Cashflow Generator)
 *
 * SCR 표44~46 "월별 자금수지(1)(2)(3)"를 생성합니다.
 * 48개월을 16개월씩 3분할하여 표 형태로 출력합니다.
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/monthly-cashflow
 */

import type { BusinessIncomeResult } from "./business-income";

// ─── 입력 타입 ───

/** 시점별 금액 스케줄 */
export interface ScheduleEntry {
  month: number;   // 착공 기준 월 (1부터 시작)
  amount: number;  // 금액 (백만원)
}

/** 월별 자금수지 입력값 */
export interface MonthlyCashflowInput {
  startDate: string;              // 착공월 (YYYY-MM)
  constructionMonths: number;     // 공사기간 (보통 48개월)
  businessIncome: BusinessIncomeResult;

  // 수입 스케줄 (시점별 비율)
  revenueSchedule: {
    apartment: ScheduleEntry[];
    officetel: ScheduleEntry[];
    balcony: ScheduleEntry[];
    commercial: ScheduleEntry[];
    interimInterest: ScheduleEntry[];
    vat: ScheduleEntry[];
  };

  // 지출 스케줄
  costSchedule: {
    land: ScheduleEntry[];               // 보통 착공 전 일시
    directConstruction: ScheduleEntry[]; // 매월 균등 또는 S커브
    indirectConstruction: ScheduleEntry[];
    sales: ScheduleEntry[];
    generalAdmin: ScheduleEntry[];       // 매월 균등 (30백만원/월)
    tax: ScheduleEntry[];
    pfFee: ScheduleEntry[];
    pfInterest: ScheduleEntry[];         // 매월 균등 (400백만원/월)
    interimInterest: ScheduleEntry[];
  };

  // 자금 조달/상환
  funding: {
    equityInvestment: number;            // 자기자본 투입
    equityInvestmentMonth: number;
    existingPfDrawdown: number;          // 기존 PF 인출
    existingPfDrawdownMonth: number;
    newPfDrawdown: number;               // 본건 PF 인출
    newPfDrawdownMonth: number;
    existingPfRepayment: number;         // 기존 PF 상환
    existingPfRepaymentMonth: number;
    newPfRepayment: number;              // 본건 PF 상환
    newPfRepaymentMonth: number;
    equityRecovery: number;              // 자기자본 회수
    equityRecoveryMonth: number;
  };
}

// ─── 출력 타입 ───

/** 월별 행 데이터 */
export interface MonthlyRow {
  period: string;                         // 'YY.MM 형식
  monthIndex: number;                     // 1-based 월 인덱스

  // 수입 항목별
  revenue: Record<string, number>;
  revenueTotal: number;

  // 지출 항목별
  cost: Record<string, number>;
  costTotal: number;

  // 사업수지 (수입 - 지출)
  operatingCashflow: number;

  // 자금조달
  fundingItems: Record<string, number>;
  fundingTotal: number;

  // 자금상환
  repaymentItems: Record<string, number>;
  repaymentTotal: number;

  // 현금 증감/잔액
  cashChange: number;
  cashBalance: number;
}

/** 월별 자금수지 결과 */
export interface MonthlyCashflowResult {
  rows: MonthlyRow[];

  // 3분할 (16개월씩)
  part1: MonthlyRow[];  // 표44
  part2: MonthlyRow[];  // 표45
  part3: MonthlyRow[];  // 표46 (나머지 + 준공/사업종료)

  summary: {
    totalRevenue: number;
    totalCost: number;
    totalFunding: number;
    totalRepayment: number;
    finalCashBalance: number;
  };
}

// ─── 내부 유틸 ───

/** YYYY-MM 형식의 날짜에 월을 더함 */
function addMonths(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) + months;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** YYYY-MM → 'YY.MM 형식 변환 */
function toDisplayPeriod(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `'${year.slice(2)}.${month}`;
}

/** 스케줄에서 특정 월의 금액 조회 */
function getScheduleAmount(schedule: ScheduleEntry[], monthIndex: number): number {
  let total = 0;
  for (const entry of schedule) {
    if (entry.month === monthIndex) {
      total += entry.amount;
    }
  }
  return total;
}

// ─── 메인 계산 함수 ───

/**
 * 월별 자금수지를 생성합니다 (SCR 표44~46)
 *
 * - 각 월별로 수입/지출/자금조달/상환 항목을 집계
 * - 현금 증감 = 사업수지 + 자금조달 - 자금상환
 * - 현금 잔액은 전월 잔액 + 당월 증감
 * - 48개월을 16개월씩 3분할 (잔여 월수는 part3에 포함)
 */
export function generateMonthlyCashflow(
  input: MonthlyCashflowInput
): MonthlyCashflowResult {
  const { startDate, constructionMonths, revenueSchedule, costSchedule, funding } = input;
  const rows: MonthlyRow[] = [];

  let cashBalance = 0;

  for (let m = 1; m <= constructionMonths; m++) {
    const yearMonth = addMonths(startDate, m - 1);
    const period = toDisplayPeriod(yearMonth);

    // 수입 항목 집계
    const revenue: Record<string, number> = {
      아파트: getScheduleAmount(revenueSchedule.apartment, m),
      오피스텔: getScheduleAmount(revenueSchedule.officetel, m),
      발코니확장비: getScheduleAmount(revenueSchedule.balcony, m),
      상가: getScheduleAmount(revenueSchedule.commercial, m),
      중도금이자: getScheduleAmount(revenueSchedule.interimInterest, m),
      VAT: getScheduleAmount(revenueSchedule.vat, m),
    };
    const revenueTotal = Object.values(revenue).reduce((s, v) => s + v, 0);

    // 지출 항목 집계
    const cost: Record<string, number> = {
      토지비: getScheduleAmount(costSchedule.land, m),
      직접공사비: getScheduleAmount(costSchedule.directConstruction, m),
      간접공사비: getScheduleAmount(costSchedule.indirectConstruction, m),
      판매비: getScheduleAmount(costSchedule.sales, m),
      일반부대비용: getScheduleAmount(costSchedule.generalAdmin, m),
      제세공과금: getScheduleAmount(costSchedule.tax, m),
      PF수수료: getScheduleAmount(costSchedule.pfFee, m),
      PF이자: getScheduleAmount(costSchedule.pfInterest, m),
      중도금이자: getScheduleAmount(costSchedule.interimInterest, m),
    };
    const costTotal = Object.values(cost).reduce((s, v) => s + v, 0);

    // 사업수지
    const operatingCashflow = revenueTotal - costTotal;

    // 자금조달 항목
    const fundingItems: Record<string, number> = {
      자기자본투입: funding.equityInvestmentMonth === m ? funding.equityInvestment : 0,
      기존PF인출: funding.existingPfDrawdownMonth === m ? funding.existingPfDrawdown : 0,
      본건PF인출: funding.newPfDrawdownMonth === m ? funding.newPfDrawdown : 0,
    };
    const fundingTotal = Object.values(fundingItems).reduce((s, v) => s + v, 0);

    // 자금상환 항목
    const repaymentItems: Record<string, number> = {
      기존PF상환: funding.existingPfRepaymentMonth === m ? funding.existingPfRepayment : 0,
      본건PF상환: funding.newPfRepaymentMonth === m ? funding.newPfRepayment : 0,
      자기자본회수: funding.equityRecoveryMonth === m ? funding.equityRecovery : 0,
    };
    const repaymentTotal = Object.values(repaymentItems).reduce((s, v) => s + v, 0);

    // 현금 증감
    const cashChange = operatingCashflow + fundingTotal - repaymentTotal;
    cashBalance += cashChange;

    rows.push({
      period,
      monthIndex: m,
      revenue,
      revenueTotal,
      cost,
      costTotal,
      operatingCashflow,
      fundingItems,
      fundingTotal,
      repaymentItems,
      repaymentTotal,
      cashChange,
      cashBalance,
    });
  }

  // 3분할 (16개월씩)
  const part1 = rows.slice(0, 16);
  const part2 = rows.slice(16, 32);
  const part3 = rows.slice(32);

  // 요약 집계
  const summary = {
    totalRevenue: rows.reduce((s, r) => s + r.revenueTotal, 0),
    totalCost: rows.reduce((s, r) => s + r.costTotal, 0),
    totalFunding: rows.reduce((s, r) => s + r.fundingTotal, 0),
    totalRepayment: rows.reduce((s, r) => s + r.repaymentTotal, 0),
    finalCashBalance: rows.length > 0 ? rows[rows.length - 1].cashBalance : 0,
  };

  return { rows, part1, part2, part3, summary };
}
