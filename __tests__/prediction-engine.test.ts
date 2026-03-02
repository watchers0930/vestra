import { describe, it, expect } from "vitest";
import { predictValue, calculateTrend } from "@/lib/prediction-engine";
import type { RealTransaction } from "@/lib/molit-api";

// ─── Mock 데이터 ───

function makeTx(overrides: Partial<RealTransaction> = {}): RealTransaction {
  return {
    aptName: "테스트아파트",
    dealAmount: 500000000,
    area: 84,
    floor: 10,
    dealYear: 2025,
    dealMonth: 6,
    dealDay: 15,
    regionCode: "11680",
    buildYear: 2015,
    roadName: "테헤란로",
    ...overrides,
  };
}

// 상승 추세 데이터 (12개월)
const risingTransactions: RealTransaction[] = [
  makeTx({ dealAmount: 450000000, dealYear: 2025, dealMonth: 1 }),
  makeTx({ dealAmount: 470000000, dealYear: 2025, dealMonth: 3 }),
  makeTx({ dealAmount: 490000000, dealYear: 2025, dealMonth: 5 }),
  makeTx({ dealAmount: 510000000, dealYear: 2025, dealMonth: 7 }),
  makeTx({ dealAmount: 530000000, dealYear: 2025, dealMonth: 9 }),
  makeTx({ dealAmount: 550000000, dealYear: 2025, dealMonth: 11 }),
];

// 하락 추세 데이터
const fallingTransactions: RealTransaction[] = [
  makeTx({ dealAmount: 600000000, dealYear: 2025, dealMonth: 1 }),
  makeTx({ dealAmount: 580000000, dealYear: 2025, dealMonth: 3 }),
  makeTx({ dealAmount: 560000000, dealYear: 2025, dealMonth: 5 }),
  makeTx({ dealAmount: 540000000, dealYear: 2025, dealMonth: 7 }),
  makeTx({ dealAmount: 520000000, dealYear: 2025, dealMonth: 9 }),
  makeTx({ dealAmount: 500000000, dealYear: 2025, dealMonth: 11 }),
];

// ─── 테스트 ───

describe("calculateTrend (추세 분석)", () => {
  it("상승 추세 데이터에서 양의 성장률을 반환한다", () => {
    const trend = calculateTrend(risingTransactions);
    expect(trend.annualGrowthRate).toBeGreaterThan(0);
    expect(trend.dataPoints).toBe(6);
  });

  it("하락 추세 데이터에서 음의 성장률을 반환한다", () => {
    const trend = calculateTrend(fallingTransactions);
    expect(trend.annualGrowthRate).toBeLessThan(0);
  });

  it("거래 데이터가 없으면 성장률 0", () => {
    const trend = calculateTrend([]);
    expect(trend.annualGrowthRate).toBe(0);
    expect(trend.dataPoints).toBe(0);
    expect(trend.r2).toBe(0);
  });

  it("거래가 1건이면 성장률 0, intercept는 거래가격", () => {
    const trend = calculateTrend([makeTx({ dealAmount: 500000000 })]);
    expect(trend.annualGrowthRate).toBe(0);
    expect(trend.intercept).toBe(500000000);
    expect(trend.dataPoints).toBe(1);
  });

  it("R² 값은 0~1 범위", () => {
    const trend = calculateTrend(risingTransactions);
    expect(trend.r2).toBeGreaterThanOrEqual(0);
    expect(trend.r2).toBeLessThanOrEqual(1);
  });

  it("성장률은 -20%~+30% 범위로 capping", () => {
    const trend = calculateTrend(risingTransactions);
    expect(trend.annualGrowthRate).toBeLessThanOrEqual(0.30);
    expect(trend.annualGrowthRate).toBeGreaterThanOrEqual(-0.20);
  });
});

describe("predictValue (가치 전망 엔진)", () => {
  describe("시나리오 순서", () => {
    it("낙관 > 기본 > 비관 순서여야 한다", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      const { optimistic, base, pessimistic } = result.predictions;

      expect(optimistic["1y"]).toBeGreaterThan(base["1y"]);
      expect(base["1y"]).toBeGreaterThan(pessimistic["1y"]);
      expect(optimistic["5y"]).toBeGreaterThan(base["5y"]);
      expect(base["5y"]).toBeGreaterThan(pessimistic["5y"]);
      expect(optimistic["10y"]).toBeGreaterThan(base["10y"]);
      expect(base["10y"]).toBeGreaterThan(pessimistic["10y"]);
    });
  });

  describe("복리 성장", () => {
    it("5년 예측이 1년 예측보다 크다 (상승 추세)", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      expect(result.predictions.base["5y"]).toBeGreaterThan(result.predictions.base["1y"]);
      expect(result.predictions.base["10y"]).toBeGreaterThan(result.predictions.base["5y"]);
    });
  });

  describe("영향 요인", () => {
    it("최소 3개 이상의 영향 요인을 반환한다", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      expect(result.factors.length).toBeGreaterThanOrEqual(3);
    });

    it("금리 전망 요인이 포함된다", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      const interestFactor = result.factors.find((f) => f.name === "금리 전망");
      expect(interestFactor).toBeDefined();
    });

    it("전세가율이 높으면 negative 요인이 포함된다", () => {
      const result = predictValue(500000000, risingTransactions, null, 80);
      const jeonse = result.factors.find((f) => f.name.includes("전세가율"));
      expect(jeonse).toBeDefined();
      expect(jeonse!.impact).toBe("negative");
    });
  });

  describe("신뢰도", () => {
    it("거래가 많으면 신뢰도가 높다", () => {
      const manyTx = predictValue(500000000, risingTransactions, null, null);
      const fewTx = predictValue(500000000, [makeTx()], null, null);
      expect(manyTx.confidence).toBeGreaterThan(fewTx.confidence);
    });

    it("신뢰도는 0~90 범위", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(90);
    });

    it("데이터 없으면 신뢰도 0", () => {
      const result = predictValue(500000000, [], null, null);
      expect(result.confidence).toBe(0);
    });
  });

  describe("반영 변수", () => {
    it("variables 배열이 존재한다", () => {
      const result = predictValue(500000000, risingTransactions, null, null);
      expect(result.variables).toBeDefined();
      expect(result.variables.length).toBeGreaterThan(0);
    });
  });

  describe("경계값", () => {
    it("현재가 0이면 모든 예측이 0", () => {
      const result = predictValue(0, risingTransactions, null, null);
      expect(result.predictions.base["1y"]).toBe(0);
      expect(result.predictions.optimistic["5y"]).toBe(0);
      expect(result.predictions.pessimistic["10y"]).toBe(0);
    });
  });
});
