import { describe, it, expect } from "vitest";
import {
  // BEP
  calculateBep,
  type BepInput,
  // Business Income
  calculateBusinessIncome,
  formatNegative,
  type BusinessIncomeInput,
  // DSCR
  calculateDscr,
  calculateDscrAtSaleRate,
  type DscrInput,
  // Monthly Cashflow
  generateMonthlyCashflow,
  type MonthlyCashflowInput,
  type ScheduleEntry,
  // Price Forecast
  forecastPrice,
  type PriceForecastInput,
  type NearbyCase,
  type RegionalPriceIndex,
  // Scenario
  calculateScenarios,
  type ScenarioInput,
  type ScenarioDefinition,
  // Sensitivity
  analyzeSensitivity,
  analyzeSingleVariableSensitivity,
  type SensitivityInput,
  type SingleVariableSensitivityInput,
} from "@/lib/feasibility/calc";

// ═══════════════════════════════════════════════════════════════════
// 1. BEP 분양률 계산기
// ═══════════════════════════════════════════════════════════════════

describe("calculateBep (BEP 분양률 계산기)", () => {
  const baseBepInput: BepInput = {
    totalRevenue: 100_000,       // 1,000억 분양수입
    totalCost: 80_000,           // 800억 사업비
    equity: 10_000,              // 100억 자기자본
    constructionReserve: 5_000,  // 50억 공사비유보
    pfTotal: 50_000,             // 500억 PF
    apartmentRevenueRatio: 0.7,  // 아파트 70%
    officetelRevenueRatio: 0.2,  // 오피스텔 20%
    commercialRevenueRatio: 0.1, // 상가 10%
  };

  it("BEP(1) - 전 시설 동일 분양률: 사업BEP는 totalCost/totalRevenue 비율 근처", () => {
    const result = calculateBep(baseBepInput);
    // 사업BEP: 수입 >= 80,000이면 되므로 80% 근처
    expect(result.bep1.businessBep).toBeCloseTo(80, 0);
    // costExit: 80,000 - 10,000 - 5,000 = 65,000 → 65% 근처
    expect(result.bep1.costExitBep).toBeCloseTo(65, 0);
    // pfExit: 50,000/100,000 = 50% 근처
    expect(result.bep1.pfExitBep).toBeCloseTo(50, 0);
  });

  it("BEP(2) - 오피스텔/상가 50% 고정, 아파트만 변동", () => {
    const result = calculateBep(baseBepInput);
    // 고정수입 = 100,000 × 0.2 × 0.5 + 100,000 × 0.1 × 0.5 = 15,000
    // 사업BEP: 아파트 수입 = 70,000 × (rate/100) ≥ 80,000 - 15,000 = 65,000
    // rate ≈ 65,000/70,000 × 100 ≈ 92.9%
    expect(result.bep2.businessBep).toBeGreaterThan(90);
    expect(result.bep2.businessBep).toBeLessThan(95);
    // PF BEP: 70,000 × (rate/100) ≥ 50,000 - 15,000 = 35,000 → rate ≈ 50%
    expect(result.bep2.pfExitBep).toBeCloseTo(50, 0);
  });

  it("BEP(3) - 오피스텔/상가 0%, 아파트만 분양", () => {
    const result = calculateBep(baseBepInput);
    // 아파트만: 70,000 × (rate/100) ≥ 80,000 → rate > 100%
    expect(result.bep3.businessBep).toBeGreaterThan(100);
    // PF BEP: 70,000 × (rate/100) ≥ 50,000 → rate ≈ 71.4%
    expect(result.bep3.pfExitBep).toBeCloseTo(71.4, 0);
  });

  it("수입이 사업비보다 훨씬 클 때 BEP가 낮게 나온다", () => {
    const result = calculateBep({
      ...baseBepInput,
      totalRevenue: 200_000, // 수입 2배
    });
    expect(result.bep1.businessBep).toBeCloseTo(40, 0);
    expect(result.bep1.pfExitBep).toBeCloseTo(25, 0);
  });

  it("수입이 사업비보다 적을 때 BEP가 100% 초과", () => {
    const result = calculateBep({
      ...baseBepInput,
      totalRevenue: 70_000, // 수입 < 사업비
      totalCost: 80_000,
    });
    // 100%로도 수입(70,000) < 사업비(80,000) → 100% 초과
    expect(result.bep1.businessBep).toBeGreaterThan(100);
  });

  it("아파트 비중 100%일 때 BEP(1)과 BEP(3) 결과가 동일", () => {
    const input: BepInput = {
      ...baseBepInput,
      apartmentRevenueRatio: 1.0,
      officetelRevenueRatio: 0,
      commercialRevenueRatio: 0,
    };
    const result = calculateBep(input);
    expect(result.bep1.businessBep).toEqual(result.bep3.businessBep);
    expect(result.bep1.pfExitBep).toEqual(result.bep3.pfExitBep);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. 사업수지 계산기
// ═══════════════════════════════════════════════════════════════════

describe("calculateBusinessIncome (사업수지 계산기)", () => {
  const baseInput: BusinessIncomeInput = {
    revenueApartment: 50_000,
    revenueOfficetel: 15_000,
    revenueBalcony: 5_000,
    revenueCommercial: 10_000,
    revenueInterimInterest: 2_000,
    revenueVat: -1_000,
    costLand: 20_000,
    costDirectConstruction: 30_000,
    costIndirectConstruction: 5_000,
    costSales: 3_000,
    costGeneralAdmin: 2_000,
    costTax: 1_000,
    costPfFee: 500,
    costPfInterest: 3_000,
    costInterimInterest: 2_000,
  };

  it("분양수입 합계를 정확히 산출한다", () => {
    const result = calculateBusinessIncome(baseInput);
    // 50000 + 15000 + 5000 + 10000 + 2000 + (-1000) = 81000
    expect(result.totalRevenue).toBe(81_000);
  });

  it("금융비용 소계를 정확히 산출한다", () => {
    const result = calculateBusinessIncome(baseInput);
    // PF수수료(500) + PF이자(3000) + 중도금이자(2000) = 5500
    expect(result.financeCostSubtotal).toBe(5_500);
  });

  it("사업비 합계 = 토지비 + 공사비 + 판관비 + 금융비용", () => {
    const result = calculateBusinessIncome(baseInput);
    // 20000 + 30000 + 5000 + 3000 + 2000 + 1000 + 5500 = 66500
    expect(result.totalCost).toBe(66_500);
  });

  it("세전 사업이익과 이익률을 정확히 계산한다", () => {
    const result = calculateBusinessIncome(baseInput);
    expect(result.profitBeforeTax).toBe(81_000 - 66_500); // 14500
    // 이익률 = 14500 / 81000 × 100 ≈ 17.90%
    expect(result.profitRate).toBeCloseTo(17.9, 1);
  });

  it("breakdown에 19개 행이 포함된다 (수입6 + 합계1 + 지출10 + 소계1 + 합계1 + 이익1 = 19 아님, 코드대로 18행)", () => {
    const result = calculateBusinessIncome(baseInput);
    // 수입 6개 + 분양수입합계 + 지출 9개 + 금융비용소계 + 사업비합계 + 사업이익 = 19
    expect(result.breakdown.length).toBe(19);
  });

  it("모든 수입이 0이면 이익률 0", () => {
    const zeroInput: BusinessIncomeInput = {
      revenueApartment: 0,
      revenueOfficetel: 0,
      revenueBalcony: 0,
      revenueCommercial: 0,
      revenueInterimInterest: 0,
      revenueVat: 0,
      costLand: 10_000,
      costDirectConstruction: 0,
      costIndirectConstruction: 0,
      costSales: 0,
      costGeneralAdmin: 0,
      costTax: 0,
      costPfFee: 0,
      costPfInterest: 0,
      costInterimInterest: 0,
    };
    const result = calculateBusinessIncome(zeroInput);
    expect(result.totalRevenue).toBe(0);
    expect(result.profitRate).toBe(0);
    // 모든 ratio도 0이어야 한다
    const nonSummaryRows = result.breakdown.filter(
      (r) => r.item !== "분양수입 합계"
    );
    for (const row of nonSummaryRows) {
      expect(row.ratio).toBe(0);
    }
  });

  it("적자 사업 시 음수 이익과 음수 이익률", () => {
    const lossInput: BusinessIncomeInput = {
      ...baseInput,
      revenueApartment: 10_000, // 수입 대폭 감소
      revenueOfficetel: 0,
      revenueBalcony: 0,
      revenueCommercial: 0,
      revenueInterimInterest: 0,
      revenueVat: 0,
    };
    const result = calculateBusinessIncome(lossInput);
    expect(result.profitBeforeTax).toBeLessThan(0);
    expect(result.profitRate).toBeLessThan(0);
  });
});

describe("formatNegative (음수 괄호 포맷)", () => {
  it("음수를 괄호 표기로 변환한다", () => {
    expect(formatNegative(-100)).toBe("(100)");
    expect(formatNegative(-1234)).toBe("(1,234)");
  });

  it("양수는 그대로 포맷한다", () => {
    expect(formatNegative(100)).toBe("100");
    expect(formatNegative(1234)).toBe("1,234");
  });

  it("0은 양수 취급한다", () => {
    expect(formatNegative(0)).toBe("0");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. DSCR 계산기
// ═══════════════════════════════════════════════════════════════════

describe("calculateDscr (DSCR 계산기)", () => {
  it("가용수입 > PF 원리금이면 DSCR >= 1.0, isAdequate = true", () => {
    const result = calculateDscr({
      totalRevenue: 80_000,
      pfTotal: 50_000,
      pfInterestTotal: 5_000,
      equity: 10_000,
      constructionReserve: 5_000,
    });
    // 가용수입 = 80,000 + 10,000 + 5,000 = 95,000
    // PF 원리금 = 50,000 + 5,000 = 55,000
    // DSCR = 95,000 / 55,000 ≈ 1.73
    expect(result.cumulativeDscr).toBeCloseTo(1.73, 1);
    expect(result.isAdequate).toBe(true);
    expect(result.creditEnhancement).toBe(0);
    expect(result.pfDebtService).toBe(55_000);
    expect(result.availableIncome).toBe(95_000);
  });

  it("가용수입 < PF 원리금이면 DSCR < 1.0, 신용보강 필요", () => {
    const result = calculateDscr({
      totalRevenue: 30_000,
      pfTotal: 50_000,
      pfInterestTotal: 5_000,
      equity: 5_000,
      constructionReserve: 2_000,
    });
    // 가용수입 = 30,000 + 5,000 + 2,000 = 37,000
    // PF 원리금 = 55,000
    // DSCR = 37,000/55,000 ≈ 0.67
    expect(result.cumulativeDscr).toBeCloseTo(0.67, 1);
    expect(result.isAdequate).toBe(false);
    expect(result.creditEnhancement).toBe(55_000 - 37_000); // 18,000
  });

  it("PF가 0이면 DSCR은 0", () => {
    const result = calculateDscr({
      totalRevenue: 80_000,
      pfTotal: 0,
      pfInterestTotal: 0,
      equity: 10_000,
      constructionReserve: 5_000,
    });
    expect(result.cumulativeDscr).toBe(0);
    expect(result.pfDebtService).toBe(0);
  });

  it("DSCR이 정확히 1.0이면 적정 판정", () => {
    const result = calculateDscr({
      totalRevenue: 45_000,
      pfTotal: 50_000,
      pfInterestTotal: 5_000,
      equity: 5_000,
      constructionReserve: 5_000,
    });
    // 가용수입 = 55,000 = PF 원리금 55,000 → DSCR = 1.0
    expect(result.cumulativeDscr).toBe(1.0);
    expect(result.isAdequate).toBe(true);
    expect(result.creditEnhancement).toBe(0);
  });
});

describe("calculateDscrAtSaleRate (분양률별 DSCR)", () => {
  it("100% 분양률이면 calculateDscr과 동일한 결과", () => {
    const directResult = calculateDscr({
      totalRevenue: 80_000,
      pfTotal: 50_000,
      pfInterestTotal: 5_000,
      equity: 10_000,
      constructionReserve: 5_000,
    });
    const saleRateResult = calculateDscrAtSaleRate(
      80_000, 1.0, 50_000, 5_000, 10_000, 5_000
    );
    expect(saleRateResult.cumulativeDscr).toBe(directResult.cumulativeDscr);
  });

  it("분양률 50%이면 수입이 절반으로 반영된다", () => {
    const result = calculateDscrAtSaleRate(
      100_000, 0.5, 50_000, 5_000, 10_000, 5_000
    );
    // totalRevenue = 100,000 × 0.5 = 50,000
    // 가용수입 = 50,000 + 10,000 + 5,000 = 65,000
    // PF 원리금 = 55,000
    // DSCR ≈ 1.18
    expect(result.cumulativeDscr).toBeCloseTo(1.18, 1);
    expect(result.availableIncome).toBe(65_000);
  });

  it("분양률 0이면 자기자본/유보만으로 평가", () => {
    const result = calculateDscrAtSaleRate(
      100_000, 0, 50_000, 5_000, 10_000, 5_000
    );
    // totalRevenue = 0
    // 가용수입 = 0 + 10,000 + 5,000 = 15,000
    // PF 원리금 = 55,000
    expect(result.availableIncome).toBe(15_000);
    expect(result.isAdequate).toBe(false);
    expect(result.creditEnhancement).toBe(55_000 - 15_000);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. 월별 자금수지 생성기
// ═══════════════════════════════════════════════════════════════════

describe("generateMonthlyCashflow (월별 자금수지)", () => {
  // BusinessIncomeResult를 만들기 위해 먼저 계산
  const businessIncome = calculateBusinessIncome({
    revenueApartment: 50_000,
    revenueOfficetel: 10_000,
    revenueBalcony: 5_000,
    revenueCommercial: 5_000,
    revenueInterimInterest: 1_000,
    revenueVat: -500,
    costLand: 20_000,
    costDirectConstruction: 25_000,
    costIndirectConstruction: 3_000,
    costSales: 2_000,
    costGeneralAdmin: 1_000,
    costTax: 500,
    costPfFee: 300,
    costPfInterest: 2_400,
    costInterimInterest: 1_000,
  });

  function makeSimpleInput(months: number): MonthlyCashflowInput {
    // 1월에 수입, 매월 균등 지출
    const revenueEntries: ScheduleEntry[] = [{ month: 1, amount: 1000 }];
    const emptySchedule: ScheduleEntry[] = [];
    const costPerMonth: ScheduleEntry[] = Array.from(
      { length: months },
      (_, i) => ({ month: i + 1, amount: 100 })
    );

    return {
      startDate: "2025-01",
      constructionMonths: months,
      businessIncome,
      revenueSchedule: {
        apartment: revenueEntries,
        officetel: emptySchedule,
        balcony: emptySchedule,
        commercial: emptySchedule,
        interimInterest: emptySchedule,
        vat: emptySchedule,
      },
      costSchedule: {
        land: [{ month: 1, amount: 5000 }],
        directConstruction: costPerMonth,
        indirectConstruction: emptySchedule,
        sales: emptySchedule,
        generalAdmin: emptySchedule,
        tax: emptySchedule,
        pfFee: emptySchedule,
        pfInterest: emptySchedule,
        interimInterest: emptySchedule,
      },
      funding: {
        equityInvestment: 5000,
        equityInvestmentMonth: 1,
        existingPfDrawdown: 3000,
        existingPfDrawdownMonth: 1,
        newPfDrawdown: 10000,
        newPfDrawdownMonth: 2,
        existingPfRepayment: 3000,
        existingPfRepaymentMonth: 36,
        newPfRepayment: 10000,
        newPfRepaymentMonth: 48,
        equityRecovery: 5000,
        equityRecoveryMonth: 48,
      },
    };
  }

  it("48개월 기준 rows 길이가 48이다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    expect(result.rows.length).toBe(48);
  });

  it("48개월 기준 3분할이 16+16+16이다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    expect(result.part1.length).toBe(16);
    expect(result.part2.length).toBe(16);
    expect(result.part3.length).toBe(16);
  });

  it("36개월 기준 3분할이 16+16+4이다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(36));
    expect(result.rows.length).toBe(36);
    expect(result.part1.length).toBe(16);
    expect(result.part2.length).toBe(16);
    expect(result.part3.length).toBe(4);
  });

  it("1월의 수입과 지출이 올바르게 집계된다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    const month1 = result.rows[0];
    expect(month1.monthIndex).toBe(1);
    expect(month1.revenue["아파트"]).toBe(1000);
    expect(month1.cost["토지비"]).toBe(5000);
    expect(month1.cost["직접공사비"]).toBe(100);
    expect(month1.revenueTotal).toBe(1000);
  });

  it("자금조달이 해당 월에 정확히 반영된다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    const month1 = result.rows[0];
    expect(month1.fundingItems["자기자본투입"]).toBe(5000);
    expect(month1.fundingItems["기존PF인출"]).toBe(3000);
    expect(month1.fundingTotal).toBe(5000 + 3000); // 8000

    const month2 = result.rows[1];
    expect(month2.fundingItems["본건PF인출"]).toBe(10000);
    expect(month2.fundingTotal).toBe(10000);
  });

  it("자금상환이 해당 월에 정확히 반영된다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    const month36 = result.rows[35];
    expect(month36.repaymentItems["기존PF상환"]).toBe(3000);

    const month48 = result.rows[47];
    expect(month48.repaymentItems["본건PF상환"]).toBe(10000);
    expect(month48.repaymentItems["자기자본회수"]).toBe(5000);
    expect(month48.repaymentTotal).toBe(15000);
  });

  it("현금잔액이 누적으로 올바르게 계산된다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    // 1월: cashChange = (1000 - 5100) + 8000 - 0 = 3900
    expect(result.rows[0].cashChange).toBe(1000 - 5100 + 8000 - 0);
    expect(result.rows[0].cashBalance).toBe(result.rows[0].cashChange);

    // 2월: cashChange = (0 - 100) + 10000 - 0 = 9900
    expect(result.rows[1].cashChange).toBe(0 - 100 + 10000);
    expect(result.rows[1].cashBalance).toBe(
      result.rows[0].cashBalance + result.rows[1].cashChange
    );
  });

  it("period가 'YY.MM 형식으로 출력된다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(12));
    expect(result.rows[0].period).toBe("'25.01");
    expect(result.rows[11].period).toBe("'25.12");
  });

  it("summary 합계가 rows 합계와 일치한다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(48));
    const totalRevenue = result.rows.reduce((s, r) => s + r.revenueTotal, 0);
    const totalCost = result.rows.reduce((s, r) => s + r.costTotal, 0);
    expect(result.summary.totalRevenue).toBe(totalRevenue);
    expect(result.summary.totalCost).toBe(totalCost);
    expect(result.summary.finalCashBalance).toBe(
      result.rows[result.rows.length - 1].cashBalance
    );
  });

  it("0개월 공사기간이면 빈 결과를 반환한다", () => {
    const result = generateMonthlyCashflow(makeSimpleInput(0));
    expect(result.rows.length).toBe(0);
    expect(result.summary.finalCashBalance).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. 시세 예측 엔진
// ═══════════════════════════════════════════════════════════════════

describe("forecastPrice (시세 예측 엔진)", () => {
  const baseNearbyCases: NearbyCase[] = [
    { name: "A단지", pricePerPyeong: 2000, saleDate: "2025-01", isPremiumCase: true, originalSalePrice: 1500 },
    { name: "B단지", pricePerPyeong: 2200, saleDate: "2025-03", isPremiumCase: true, originalSalePrice: 1800 },
    { name: "C단지", pricePerPyeong: 1800, saleDate: "2025-06", isPremiumCase: false },
  ];

  const baseIndices: RegionalPriceIndex[] = [
    { month: "2023-01", index: 100 },
    { month: "2023-07", index: 102 },
    { month: "2024-01", index: 105 },
    { month: "2024-07", index: 108 },
    { month: "2025-01", index: 110 },
  ];

  const baseForecastInput: PriceForecastInput = {
    address: "서울시 강남구",
    projectType: "신축",
    completionDate: "2028-06",
    plannedPricePerPyeong: 2100,
    nearbyCases: baseNearbyCases,
    regionalPriceIndex: baseIndices,
  };

  it("현재 평균 시세를 올바르게 산출한다", () => {
    const result = forecastPrice(baseForecastInput);
    // (2000 + 2200 + 1800) / 3 = 2000
    expect(result.currentAvgPrice).toBe(2000);
  });

  it("시세 범위(min/max)를 올바르게 산출한다", () => {
    const result = forecastPrice(baseForecastInput);
    expect(result.priceRange.min).toBe(1800);
    expect(result.priceRange.max).toBe(2200);
  });

  it("프리미엄률을 올바르게 계산한다", () => {
    const result = forecastPrice(baseForecastInput);
    // A: (2000-1500)/1500 = 33.33%
    // B: (2200-1800)/1800 = 22.22%
    // 평균: (33.33 + 22.22) / 2 ≈ 27.78%
    expect(result.avgPremiumRate).toBeCloseTo(27.78, 0);
  });

  it("연간 성장률이 양수로 계산된다 (상승 추세)", () => {
    const result = forecastPrice(baseForecastInput);
    // 2023-01 ~ 2025-01 동안 100 → 110 (2년간 약 5%/년)
    expect(result.annualGrowthRate).toBeGreaterThan(0);
  });

  it("시나리오별 예측 시세: conservative <= moderate <= optimistic", () => {
    const result = forecastPrice(baseForecastInput);
    expect(result.forecast.conservative).toBeLessThanOrEqual(result.forecast.moderate);
    expect(result.forecast.moderate).toBeLessThanOrEqual(result.forecast.optimistic);
  });

  it("분양가 적정성 평가 - 적정 범위 (±10%)", () => {
    const result = forecastPrice(baseForecastInput);
    // 계획 분양가 2100, 현재 평균 2000 → 차이 5% → 적정
    expect(result.priceComparison.gapAmount).toBe(100);
    expect(result.priceComparison.gapRate).toBeCloseTo(5, 0);
    expect(result.priceComparison.assessment).toBe("적정");
  });

  it("분양가가 시세 대비 15% 이상이면 고가 판정", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      plannedPricePerPyeong: 2400, // 2000 대비 20% 고가
    });
    expect(result.priceComparison.assessment).toBe("고가");
  });

  it("분양가가 시세 대비 5% 이상 저렴하면 할인 판정", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      plannedPricePerPyeong: 1800, // 2000 대비 -10% → 할인
    });
    expect(result.priceComparison.assessment).toBe("할인");
  });

  it("재건축 프로젝트일 때 reconstruction 분석이 포함된다", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      projectType: "재건축",
    });
    expect(result.reconstruction).toBeDefined();
    expect(result.reconstruction!.currentPrice).toBe(2000);
    expect(result.reconstruction!.estimatedPostPrice).toBe(result.forecast.moderate);
  });

  it("신축 프로젝트일 때 reconstruction이 undefined", () => {
    const result = forecastPrice(baseForecastInput);
    expect(result.reconstruction).toBeUndefined();
  });

  it("인근 사례가 없으면 평균 시세 0, 예측 시세 0", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      nearbyCases: [],
    });
    expect(result.currentAvgPrice).toBe(0);
    expect(result.priceRange.min).toBe(0);
    expect(result.priceRange.max).toBe(0);
    expect(result.forecast.moderate).toBe(0);
  });

  it("가격지수가 1개 이하이면 연간 성장률 0%", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      regionalPriceIndex: [{ month: "2025-01", index: 100 }],
    });
    expect(result.annualGrowthRate).toBe(0);
  });

  it("프리미엄 사례가 없으면 평균 프리미엄률 0%", () => {
    const noPremium: NearbyCase[] = [
      { name: "A단지", pricePerPyeong: 2000, saleDate: "2025-01", isPremiumCase: false },
    ];
    const result = forecastPrice({
      ...baseForecastInput,
      nearbyCases: noPremium,
    });
    expect(result.avgPremiumRate).toBe(0);
  });

  it("가격지수가 모두 같은 시점이면 연간 성장률 0% (denominator=0)", () => {
    // 모든 지수가 같은 month → x값이 모두 0 → denominator = 0
    const sameMonthIndices: RegionalPriceIndex[] = [
      { month: "2025-01", index: 100 },
      { month: "2025-01", index: 105 },
      { month: "2025-01", index: 110 },
    ];
    const result = forecastPrice({
      ...baseForecastInput,
      regionalPriceIndex: sameMonthIndices,
    });
    expect(result.annualGrowthRate).toBe(0);
  });

  it("프리미엄 사례의 원래 분양가가 0이면 해당 건 프리미엄률 0%", () => {
    const zeroPriceCases: NearbyCase[] = [
      { name: "A단지", pricePerPyeong: 2000, saleDate: "2025-01", isPremiumCase: true, originalSalePrice: 0 },
      { name: "B단지", pricePerPyeong: 2200, saleDate: "2025-03", isPremiumCase: true, originalSalePrice: 1800 },
    ];
    const result = forecastPrice({
      ...baseForecastInput,
      nearbyCases: zeroPriceCases,
    });
    // A의 originalSalePrice=0 → isPremiumCase이지만 filter에서 제외 (> 0 조건)
    // B만 프리미엄 계산: (2200-1800)/1800 ≈ 22.22%
    expect(result.avgPremiumRate).toBeCloseTo(22.22, 0);
  });

  it("재건축 시 분양가가 시세보다 낮으면 분담금 0", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      projectType: "재건축",
      plannedPricePerPyeong: 1500, // 현재 시세(2000)보다 낮음
    });
    expect(result.reconstruction!.contributionPerUnit).toBe(0);
  });

  it("가격지수 intercept가 0이면 연간 성장률 0% (intercept=0 분기)", () => {
    // 선형 회귀에서 intercept가 0이 되려면 sumY - slope * sumX = 0
    // 간단한 방법: 지수가 0 근방이면서 기울기도 0에 수렴하는 데이터
    // 가장 쉬운 예: 모든 index가 0
    const zeroIndices: RegionalPriceIndex[] = [
      { month: "2023-01", index: 0 },
      { month: "2024-01", index: 0 },
      { month: "2025-01", index: 0 },
    ];
    const result = forecastPrice({
      ...baseForecastInput,
      regionalPriceIndex: zeroIndices,
    });
    expect(result.annualGrowthRate).toBe(0);
  });

  it("재건축 시 분양가가 0이면 수익률 0", () => {
    const result = forecastPrice({
      ...baseForecastInput,
      projectType: "재건축",
      plannedPricePerPyeong: 0,
    });
    expect(result.reconstruction!.profitRate).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. 시나리오 엔진
// ═══════════════════════════════════════════════════════════════════

describe("calculateScenarios (시나리오 엔진)", () => {
  const baseBusinessInput: BusinessIncomeInput = {
    revenueApartment: 60_000,
    revenueOfficetel: 15_000,
    revenueBalcony: 8_000,
    revenueCommercial: 10_000,
    revenueInterimInterest: 3_000,
    revenueVat: -2_000,
    costLand: 20_000,
    costDirectConstruction: 30_000,
    costIndirectConstruction: 5_000,
    costSales: 3_000,
    costGeneralAdmin: 2_000,
    costTax: 1_000,
    costPfFee: 500,
    costPfInterest: 3_000,
    costInterimInterest: 1_500,
  };

  const baseIncome = calculateBusinessIncome(baseBusinessInput);

  const scenarios: ScenarioDefinition[] = [
    { name: "시나리오1", apartmentSaleRate: 0.95, officetelSaleRate: 0.50, commercialSaleRate: 0.50 },
    { name: "시나리오2", apartmentSaleRate: 0.85, officetelSaleRate: 0.30, commercialSaleRate: 0.30 },
    { name: "시나리오3", apartmentSaleRate: 0.70, officetelSaleRate: 0.10, commercialSaleRate: 0.10 },
  ];

  const scenarioInput: ScenarioInput = {
    baseIncome,
    baseInput: baseBusinessInput,
    scenarios,
  };

  it("projections에 차주안 + 시나리오 수 만큼 결과가 나온다", () => {
    const result = calculateScenarios(scenarioInput);
    // 차주안 1개 + 시나리오 3개 = 4개
    expect(result.projections.length).toBe(4);
    expect(result.projections[0].name).toBe("차주안");
    expect(result.projections[1].name).toBe("시나리오1");
  });

  it("차주안(base)의 총수입은 원래 계산 결과와 동일하다", () => {
    const result = calculateScenarios(scenarioInput);
    expect(result.projections[0].totalRevenue).toBe(baseIncome.totalRevenue);
    expect(result.projections[0].profitRate).toBe(baseIncome.profitRate);
  });

  it("분양률이 낮은 시나리오일수록 수입이 적다", () => {
    const result = calculateScenarios(scenarioInput);
    const [base, s1, s2, s3] = result.projections;
    expect(base.totalRevenue).toBeGreaterThan(s1.totalRevenue);
    expect(s1.totalRevenue).toBeGreaterThan(s2.totalRevenue);
    expect(s2.totalRevenue).toBeGreaterThan(s3.totalRevenue);
  });

  it("모든 시나리오에서 비용(totalCost)은 동일하다", () => {
    const result = calculateScenarios(scenarioInput);
    for (const proj of result.projections) {
      expect(proj.totalCost).toBe(baseIncome.totalCost);
    }
  });

  it("conditions에 3가지 분양률 조건이 포함된다", () => {
    const result = calculateScenarios(scenarioInput);
    expect(result.conditions.length).toBe(3);
    expect(result.conditions[0].type).toBe("아파트 분양률");
    expect(result.conditions[1].type).toBe("오피스텔 분양률");
    expect(result.conditions[2].type).toBe("상가 분양률");
    // 차주안 기준값은 100%
    expect(result.conditions[0].base).toBe(100);
  });

  it("발코니확장비가 아파트 분양률에 연동된다", () => {
    const result = calculateScenarios(scenarioInput);
    const s1 = result.projections[1]; // apartmentSaleRate = 0.95
    expect(s1.revenue["발코니확장비"]).toBe(Math.round(8_000 * 0.95));
  });

  it("수입이 0인 경우 profitRate가 0이다", () => {
    const zeroScenarios: ScenarioDefinition[] = [
      { name: "전멸", apartmentSaleRate: 0, officetelSaleRate: 0, commercialSaleRate: 0 },
    ];
    const result = calculateScenarios({
      baseIncome,
      baseInput: baseBusinessInput,
      scenarios: zeroScenarios,
    });
    const zeroProj = result.projections[1];
    expect(zeroProj.totalRevenue).toBe(0);
    expect(zeroProj.profitRate).toBe(0);
  });

  it("baseMainRevenue가 0이면 중도금이자/VAT 비례 조정이 0이다", () => {
    // 주요 수입(아파트+오피스텔+발코니+상가)이 모두 0인 경우
    const zeroRevenueInput: BusinessIncomeInput = {
      revenueApartment: 0,
      revenueOfficetel: 0,
      revenueBalcony: 0,
      revenueCommercial: 0,
      revenueInterimInterest: 3_000,
      revenueVat: -1_000,
      costLand: 10_000,
      costDirectConstruction: 15_000,
      costIndirectConstruction: 2_000,
      costSales: 1_000,
      costGeneralAdmin: 500,
      costTax: 300,
      costPfFee: 200,
      costPfInterest: 1_000,
      costInterimInterest: 500,
    };
    const zeroRevenueIncome = calculateBusinessIncome(zeroRevenueInput);
    const scenariosForZero: ScenarioDefinition[] = [
      { name: "테스트", apartmentSaleRate: 0.5, officetelSaleRate: 0.5, commercialSaleRate: 0.5 },
    ];
    const result = calculateScenarios({
      baseIncome: zeroRevenueIncome,
      baseInput: zeroRevenueInput,
      scenarios: scenariosForZero,
    });
    const testProj = result.projections[1];
    // baseMainRevenue = 0 → revenueRatio = 0 → 중도금이자/VAT 모두 0
    expect(testProj.revenue["중도금이자"]).toBe(0);
    // Math.round(-1000 * 0) = -0, so use toEqual which handles -0 vs 0
    expect(testProj.revenue["VAT"] + 0).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. 민감도 분석 엔진
// ═══════════════════════════════════════════════════════════════════

describe("analyzeSensitivity (시나리오별 민감도)", () => {
  const baseInput: SensitivityInput = {
    baseRevenue: 100_000,
    totalCost: 80_000,
    pfTotal: 50_000,
    pfInterestTotal: 5_000,
    equity: 10_000,
    constructionReserve: 5_000,
    totalSalePriceAtFull: 100_000,
    scenarios: [
      { name: "차주안", saleRate: 1.0 },
      { name: "시나리오1", saleRate: 0.95 },
      { name: "시나리오2", saleRate: 0.85 },
      { name: "시나리오3", saleRate: 0.70 },
    ],
  };

  it("시나리오 수 만큼 결과 행이 생성된다", () => {
    const result = analyzeSensitivity(baseInput);
    expect(result.scenarios.length).toBe(4);
  });

  it("차주안(100%)의 수입이 baseRevenue와 동일하다", () => {
    const result = analyzeSensitivity(baseInput);
    expect(result.scenarios[0].totalRevenue).toBe(100_000);
    expect(result.scenarios[0].maturitySaleRate).toBe(100);
  });

  it("분양률이 낮을수록 이익이 감소한다", () => {
    const result = analyzeSensitivity(baseInput);
    const [s0, s1, s2, s3] = result.scenarios;
    expect(s0.profitBeforeTax).toBeGreaterThan(s1.profitBeforeTax);
    expect(s1.profitBeforeTax).toBeGreaterThan(s2.profitBeforeTax);
    expect(s2.profitBeforeTax).toBeGreaterThan(s3.profitBeforeTax);
  });

  it("미분양재고가 (1-분양률) × 분양가총액으로 계산된다", () => {
    const result = analyzeSensitivity(baseInput);
    // 시나리오2: saleRate=0.85 → unsold = 100,000 × 0.15 = 15,000
    expect(result.scenarios[2].unsoldInventory).toBe(15_000);
    // 차주안: saleRate=1.0 → unsold = 0
    expect(result.scenarios[0].unsoldInventory).toBe(0);
  });

  it("각 시나리오의 DSCR이 올바르게 계산된다", () => {
    const result = analyzeSensitivity(baseInput);
    // 차주안: 가용수입 = 100,000 + 10,000 + 5,000 = 115,000
    // PF 원리금 = 55,000 → DSCR = 115,000/55,000 ≈ 2.09
    expect(result.scenarios[0].cumulativeDscr).toBeCloseTo(2.09, 1);
    expect(result.scenarios[0].creditEnhancement).toBe(0);
  });

  it("분양률이 낮으면 신용보강 금액이 발생할 수 있다", () => {
    const lowInput: SensitivityInput = {
      ...baseInput,
      equity: 1_000,
      constructionReserve: 1_000,
      scenarios: [
        { name: "극저", saleRate: 0.3 },
      ],
    };
    const result = analyzeSensitivity(lowInput);
    // 수입 = 30,000 + 자본 1,000 + 유보 1,000 = 32,000
    // PF 원리금 = 55,000 → 신용보강 = 23,000
    expect(result.scenarios[0].creditEnhancement).toBeGreaterThan(0);
    expect(result.scenarios[0].cumulativeDscr).toBeLessThan(1);
  });

  it("수입이 0일 때 profitRate은 0이다", () => {
    const zeroInput: SensitivityInput = {
      ...baseInput,
      scenarios: [{ name: "zero", saleRate: 0 }],
    };
    const result = analyzeSensitivity(zeroInput);
    expect(result.scenarios[0].totalRevenue).toBe(0);
    expect(result.scenarios[0].profitRate).toBe(0);
  });
});

describe("analyzeSingleVariableSensitivity (단일 변수 민감도)", () => {
  const baseRevenueSideInput: SingleVariableSensitivityInput = {
    variableName: "분양가",
    baseValue: 50_000,
    changePercents: [-10, -5, 0, 5, 10],
    baseRevenue: 100_000,
    baseCost: 80_000,
    isRevenueSide: true,
  };

  it("변동률 수 만큼 결과 행이 생성된다", () => {
    const result = analyzeSingleVariableSensitivity(baseRevenueSideInput);
    expect(result.length).toBe(5);
  });

  it("0% 변동 시 이익 변동이 0이다", () => {
    const result = analyzeSingleVariableSensitivity(baseRevenueSideInput);
    const zeroRow = result.find((r) => r.changePercent === 0)!;
    expect(zeroRow.profitImpact).toBe(0);
    expect(zeroRow.profitRateImpact).toBe(0);
    expect(zeroRow.adjustedValue).toBe(50_000);
  });

  it("수입항목 +10% 변동 시 이익이 증가한다", () => {
    const result = analyzeSingleVariableSensitivity(baseRevenueSideInput);
    const plus10 = result.find((r) => r.changePercent === 10)!;
    // adjustedValue = 50,000 × 1.1 = 55,000 → delta = +5,000
    // newRevenue = 105,000, newCost = 80,000 → newProfit = 25,000
    // baseProfit = 20,000 → profitImpact = +5,000
    expect(plus10.adjustedValue).toBe(55_000);
    expect(plus10.profitImpact).toBe(5_000);
  });

  it("수입항목 -10% 변동 시 이익이 감소한다", () => {
    const result = analyzeSingleVariableSensitivity(baseRevenueSideInput);
    const minus10 = result.find((r) => r.changePercent === -10)!;
    expect(minus10.profitImpact).toBe(-5_000);
  });

  it("비용항목 변동 시 이익이 반대 방향으로 변한다", () => {
    const costInput: SingleVariableSensitivityInput = {
      variableName: "공사비",
      baseValue: 30_000,
      changePercents: [-10, 0, 10],
      baseRevenue: 100_000,
      baseCost: 80_000,
      isRevenueSide: false,
    };
    const result = analyzeSingleVariableSensitivity(costInput);

    // 공사비 +10%: delta = +3000, newCost = 83000, profit = 17000
    // baseProfit = 20000 → profitImpact = -3000
    const plus10 = result.find((r) => r.changePercent === 10)!;
    expect(plus10.profitImpact).toBe(-3_000);

    // 공사비 -10%: delta = -3000, newCost = 77000, profit = 23000
    const minus10 = result.find((r) => r.changePercent === -10)!;
    expect(minus10.profitImpact).toBe(3_000);
  });

  it("profitRateImpact이 올바르게 계산된다", () => {
    const result = analyzeSingleVariableSensitivity(baseRevenueSideInput);
    const plus10 = result.find((r) => r.changePercent === 10)!;
    // base: profit=20000, revenue=100000 → profitRate = 20%
    // new: profit=25000, revenue=105000 → profitRate = 23.809...%
    // impact = 23.81 - 20.00 = 3.81
    expect(plus10.profitRateImpact).toBeCloseTo(3.81, 1);
  });

  it("수입이 0인 경우에도 에러 없이 동작한다", () => {
    const zeroInput: SingleVariableSensitivityInput = {
      variableName: "분양가",
      baseValue: 0,
      changePercents: [-10, 0, 10],
      baseRevenue: 0,
      baseCost: 50_000,
      isRevenueSide: true,
    };
    const result = analyzeSingleVariableSensitivity(zeroInput);
    expect(result.length).toBe(3);
    // 수입 0일 때 baseProfitRate = 0 → profitRateImpact도 0
    for (const row of result) {
      expect(row.adjustedValue).toBe(0);
      expect(row.profitRateImpact).toBe(0);
    }
  });
});
