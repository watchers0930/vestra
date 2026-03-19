import { describe, it, expect } from "vitest";
import { runBacktest } from "@/lib/backtesting";

function generateTransactions(months: number, basePrice: number, trend: number = 0.005) {
  const txs = [];
  const now = new Date();
  for (let i = months; i >= 1; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const price = basePrice * (1 + trend * (months - i));
    txs.push({
      dealAmount: Math.round(price),
      buildYear: 2015,
      dealYear: date.getFullYear(),
      dealMonth: date.getMonth() + 1,
      dealDay: 15,
      aptName: "테스트아파트",
      area: 84,
      floor: 10,
      dong: "101동",
      regionCode: "11680",
    });
  }
  return txs;
}

describe("runBacktest", () => {
  it("18개월 이상 데이터로 백테스팅 결과를 반환한다", () => {
    const txs = generateTransactions(24, 500000000);
    const result = runBacktest(txs);
    expect(result).not.toBeNull();
    expect(result!.mape).toBeGreaterThanOrEqual(0);
    expect(result!.rmse).toBeGreaterThanOrEqual(0);
    expect(result!.accuracy12m).toBeGreaterThanOrEqual(0);
    expect(result!.accuracy12m).toBeLessThanOrEqual(100);
    expect(result!.sampleCount).toBeGreaterThan(0);
    expect(result!.period).toBeTruthy();
  });

  it("18개월 미만 데이터는 null을 반환한다", () => {
    const txs = generateTransactions(12, 500000000);
    const result = runBacktest(txs);
    expect(result).toBeNull();
  });

  it("빈 배열은 null을 반환한다", () => {
    const result = runBacktest([]);
    expect(result).toBeNull();
  });

  it("MAPE가 합리적인 범위 내에 있다 (0~50%)", () => {
    const txs = generateTransactions(36, 800000000, 0.003);
    const result = runBacktest(txs);
    if (result) {
      expect(result.mape).toBeLessThan(50);
    }
  });

  it("안정적 데이터에서 높은 정확도를 보인다", () => {
    const txs = generateTransactions(36, 500000000, 0.001);
    const result = runBacktest(txs);
    if (result) {
      expect(result.accuracy12m).toBeGreaterThan(50);
    }
  });
});
