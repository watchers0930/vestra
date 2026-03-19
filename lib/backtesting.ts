/**
 * VESTRA 백테스팅 엔진
 * ─────────────────────
 * Rolling Window 방식으로 과거 예측 정확도를 검증.
 * 36개월 데이터 중 처음 24개월로 학습, 이후 12개월로 검증.
 */

import type { RealTransaction } from "./molit-api";
import { toMonthlyTimeSeries, calculateTrend } from "./prediction-engine";
import type { BacktestResult } from "./prediction-engine";

interface MonthlyError {
  month: string;
  predicted: number;
  actual: number;
  error: number;
}

/**
 * Rolling Window 백테스팅
 *
 * @param transactions - 전체 거래 데이터 (36개월 권장)
 * @returns 백테스팅 결과 (MAPE, RMSE, 정확도)
 */
export function runBacktest(transactions: RealTransaction[]): BacktestResult | null {
  const series = toMonthlyTimeSeries(transactions);

  // 최소 18개월 필요 (12개월 학습 + 6개월 검증)
  if (series.length < 18) return null;

  const trainSize = Math.max(12, series.length - 12);
  const testSize = series.length - trainSize;

  if (testSize < 3) return null;

  const trainSeries = series.slice(0, trainSize);
  const testSeries = series.slice(trainSize);

  // 학습 데이터로 추세 계산
  const trainPrices = trainSeries.map((s) => s.avgPrice);
  const lastTrainPrice = trainPrices[trainPrices.length - 1];

  // 단순 추세 기반 예측 (선형 외삽)
  const n = trainPrices.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += trainPrices[i];
    sumXY += i * trainPrices[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // 검증
  const monthlyErrors: MonthlyError[] = [];
  let sumAbsError = 0;
  let sumSquaredError = 0;

  for (let i = 0; i < testSeries.length; i++) {
    const predicted = Math.round(slope * (trainSize + i) + intercept);
    const actual = testSeries[i].avgPrice;

    const absError = Math.abs(predicted - actual);
    const pctError = actual > 0 ? absError / actual : 0;

    sumAbsError += pctError;
    sumSquaredError += (predicted - actual) ** 2;

    monthlyErrors.push({
      month: testSeries[i].yearMonth,
      predicted,
      actual,
      error: Math.round(pctError * 1000) / 10, // %
    });
  }

  const sampleCount = testSeries.length;
  const mape = Math.round((sumAbsError / sampleCount) * 1000) / 10; // %
  const rmse = Math.round(Math.sqrt(sumSquaredError / sampleCount));
  const accuracy12m = Math.round((100 - mape) * 10) / 10;

  const firstMonth = testSeries[0].yearMonth;
  const lastMonth = testSeries[testSeries.length - 1].yearMonth;

  return {
    mape,
    rmse,
    accuracy12m: Math.max(0, accuracy12m),
    sampleCount,
    period: `${firstMonth} ~ ${lastMonth}`,
  };
}
