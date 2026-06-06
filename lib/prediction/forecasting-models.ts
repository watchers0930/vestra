/**
 * 예측 모델 모음 — 5모델 앙상블
 *
 * 평균회귀, 모멘텀, ARIMA(1,1,1), ETS(Holt-Winters), 선형추세 모델과
 * R² 기반 동적 가중 앙상블 결합을 포함합니다.
 *
 * @module lib/prediction/forecasting-models
 */

import type { RealTransaction } from "../molit-api";
import type { ModelResult, EnsemblePredictionResult } from "../patent-types";

// ─── 공용 타입 ───

export interface ScenarioPredictions {
  "1y": number;
  "5y": number;
  "10y": number;
}

export interface MacroEconomicFactors {
  baseRate: number;
  baseRateDate: string;
  supplyVolume?: number;
  supplyRegion?: string;
  dataSource: "live" | "fallback";
  rebSaleChangeRate?: number;
  rebJeonseChangeRate?: number;
  rebMarketTrend?: "상승" | "하락" | "보합";
  buildingAge?: number;
  buildingFloors?: number;
  buildingHouseholds?: number;
  constructorName?: string;
  corridorType?: string;
  cctvCount?: number;
  crossValidation?: {
    confidence: "high" | "medium" | "low";
    deviation: number;
  };
}

export interface MonthlyTimeSeries {
  yearMonth: string;
  avgPrice: number;
  count: number;
}

// ─── 상수 ───

export const ECONOMIC_DEFAULTS = {
  baseInterestRate: 2.75,
  inflationRate: 0.025,
  gdpGrowth: 0.02,
  longTermAvgGrowth: 0.03,
};

// ─── 공용 유틸 ───

/** 복리 성장 적용 */
export function compoundGrowth(price: number, annualRate: number, years: number): number {
  return Math.round(price * Math.pow(1 + annualRate, years));
}

/** 거래 데이터를 월별 평균가 시계열로 변환 */
export function toMonthlyTimeSeries(transactions: RealTransaction[]): MonthlyTimeSeries[] {
  const grouped = new Map<string, number[]>();

  for (const tx of transactions) {
    const key = `${tx.dealYear}-${String(tx.dealMonth).padStart(2, "0")}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(tx.dealAmount);
  }

  const series: MonthlyTimeSeries[] = [];
  for (const [yearMonth, prices] of grouped) {
    series.push({
      yearMonth,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    });
  }

  return series.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

// ─── 평균회귀 모델 ───

export function meanReversionModel(
  currentPrice: number,
  transactions: RealTransaction[],
): { prediction: ScenarioPredictions; r2: number } {
  if (transactions.length < 2 || currentPrice <= 0) {
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  const avgPrice = transactions.reduce((sum, tx) => sum + tx.dealAmount, 0) / transactions.length;
  const deviation = (currentPrice - avgPrice) / avgPrice;
  const reversionRate = -0.3 * deviation;
  const inflation = ECONOMIC_DEFAULTS.inflationRate;

  const predict = (years: number) =>
    Math.round(currentPrice * Math.pow(1 + reversionRate, years) * Math.pow(1 + inflation, years));

  const r2 = Math.max(0, Math.min(1, 1 - Math.abs(deviation)));

  return {
    prediction: { "1y": predict(1), "5y": predict(5), "10y": predict(10) },
    r2,
  };
}

// ─── 모멘텀 모델 ───

interface TrendInput {
  annualGrowthRate: number;
  r2: number;
}

export function momentumModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendInput,
  calculateTrendFn: (txs: RealTransaction[]) => TrendInput,
): { prediction: ScenarioPredictions; r2: number } {
  if (transactions.length < 3 || currentPrice <= 0) {
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  const now = new Date();
  const recentTxs = transactions.filter((tx) => {
    const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
    const monthsAgo = (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    return monthsAgo <= 6;
  });

  const recentGrowth = recentTxs.length >= 2
    ? calculateTrendFn(recentTxs).annualGrowthRate
    : trend.annualGrowthRate;

  const predict = (years: number) => {
    const decayFactor = Math.exp(-0.15 * years);
    const rate = recentGrowth * decayFactor;
    return Math.round(currentPrice * Math.pow(1 + rate, years));
  };

  const recencyBonus = recentTxs.length >= 3 ? 1.0 : recentTxs.length >= 2 ? 0.7 : 0.3;
  const r2 = Math.max(0, Math.min(1, trend.r2 * recencyBonus));

  return {
    prediction: { "1y": predict(1), "5y": predict(5), "10y": predict(10) },
    r2,
  };
}

// ─── ARIMA(1,1,1) 모델 ───

export function arimaModel(
  currentPrice: number,
  transactions: RealTransaction[],
): { prediction: ScenarioPredictions; r2: number } {
  const series = toMonthlyTimeSeries(transactions);
  if (series.length < 12) {
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  const prices = series.map((s) => s.avgPrice);

  const diff: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    diff.push(prices[i] - prices[i - 1]);
  }

  let sumXY = 0, sumX2 = 0;
  for (let i = 1; i < diff.length; i++) {
    sumXY += diff[i] * diff[i - 1];
    sumX2 += diff[i - 1] * diff[i - 1];
  }
  const phi = sumX2 > 0 ? Math.max(-0.95, Math.min(0.95, sumXY / sumX2)) : 0;

  const residuals: number[] = [];
  for (let i = 1; i < diff.length; i++) {
    residuals.push(diff[i] - phi * diff[i - 1]);
  }
  let resXY = 0, resX2 = 0;
  for (let i = 1; i < residuals.length; i++) {
    resXY += residuals[i] * residuals[i - 1];
    resX2 += residuals[i - 1] * residuals[i - 1];
  }
  const theta = resX2 > 0 ? Math.max(-0.95, Math.min(0.95, resXY / resX2)) : 0;

  const lastPrice = prices[prices.length - 1];
  const lastDiff = diff[diff.length - 1];
  const lastResidual = residuals.length > 0 ? residuals[residuals.length - 1] : 0;

  const forecast = (months: number): number => {
    let price = lastPrice;
    let prevDiff = lastDiff;
    let prevResidual = lastResidual;

    for (let m = 0; m < months; m++) {
      const nextDiff = phi * prevDiff + theta * prevResidual;
      price += nextDiff;
      prevResidual = 0;
      prevDiff = nextDiff;
    }
    return Math.max(price, currentPrice * 0.3);
  };

  const meanDiff = diff.reduce((a, b) => a + b, 0) / diff.length;
  const ssTot = diff.reduce((s, d) => s + (d - meanDiff) ** 2, 0);
  let ssRes = 0;
  for (let i = 1; i < diff.length; i++) {
    const predicted = phi * diff[i - 1] + theta * (i > 1 ? residuals[i - 2] || 0 : 0);
    ssRes += (diff[i] - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    prediction: {
      "1y": Math.round(forecast(12)),
      "5y": Math.round(forecast(60)),
      "10y": Math.round(forecast(120)),
    },
    r2: Math.min(r2, 0.95),
  };
}

// ─── ETS(A,A,A) — Holt-Winters 3중 지수평활 ───

export function etsModel(
  currentPrice: number,
  transactions: RealTransaction[],
): { prediction: ScenarioPredictions; r2: number } {
  const series = toMonthlyTimeSeries(transactions);
  if (series.length < 12) {
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  const prices = series.map((s) => s.avgPrice);
  const n = prices.length;
  const seasonLength = 12;

  const alpha = 0.3;
  const beta = 0.1;
  const gamma = series.length >= 24 ? 0.15 : 0;

  let level = prices.slice(0, Math.min(seasonLength, n)).reduce((a, b) => a + b, 0)
    / Math.min(seasonLength, n);
  let trendVal = n >= 2 ? (prices[Math.min(seasonLength, n) - 1] - prices[0])
    / Math.min(seasonLength, n) : 0;

  const seasonal: number[] = new Array(seasonLength).fill(0);
  if (gamma > 0 && n >= seasonLength) {
    for (let i = 0; i < seasonLength; i++) {
      seasonal[i] = prices[i] - level;
    }
  }

  const fitted: number[] = [];
  for (let t = 0; t < n; t++) {
    const sIdx = t % seasonLength;
    const fittedVal = level + trendVal + seasonal[sIdx];
    fitted.push(fittedVal);

    const newLevel = alpha * (prices[t] - seasonal[sIdx]) + (1 - alpha) * (level + trendVal);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trendVal;
    if (gamma > 0) {
      seasonal[sIdx] = gamma * (prices[t] - newLevel) + (1 - gamma) * seasonal[sIdx];
    }
    level = newLevel;
    trendVal = newTrend;
  }

  const forecast = (months: number): number => {
    let price = level + trendVal * months;
    if (gamma > 0) {
      price += seasonal[(n + months - 1) % seasonLength];
    }
    return Math.max(price, currentPrice * 0.3);
  };

  const meanPrice = prices.reduce((a, b) => a + b, 0) / n;
  const ssTot = prices.reduce((s, p) => s + (p - meanPrice) ** 2, 0);
  const ssRes = prices.reduce((s, p, i) => s + (p - fitted[i]) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    prediction: {
      "1y": Math.round(forecast(12)),
      "5y": Math.round(forecast(60)),
      "10y": Math.round(forecast(120)),
    },
    r2: Math.min(r2, 0.95),
  };
}

// ─── 5모델 앙상블 V2 ───

export function buildEnsembleV2(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendInput,
  calculateTrendFn: (txs: RealTransaction[]) => TrendInput,
  macroFactors?: MacroEconomicFactors,
): EnsemblePredictionResult {
  const linearPred: ScenarioPredictions = {
    "1y": compoundGrowth(currentPrice, trend.annualGrowthRate, 1),
    "5y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.85, 5),
    "10y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3, 10),
  };
  const meanRev = meanReversionModel(currentPrice, transactions);
  const mom = momentumModel(currentPrice, transactions, trend, calculateTrendFn);
  const arima = arimaModel(currentPrice, transactions);
  const ets = etsModel(currentPrice, transactions);

  const models: ModelResult[] = [
    { modelName: "linear", prediction: linearPred, r2: trend.r2, weight: 0 },
    { modelName: "meanReversion", prediction: meanRev.prediction, r2: meanRev.r2, weight: 0 },
    { modelName: "momentum", prediction: mom.prediction, r2: mom.r2, weight: 0 },
    { modelName: "arima", prediction: arima.prediction, r2: arima.r2, weight: 0 },
    { modelName: "ets", prediction: ets.prediction, r2: ets.r2, weight: 0 },
  ];

  const activeModels = models.filter((m) => m.r2 > 0 || ["linear", "meanReversion", "momentum"].includes(m.modelName));

  const minWeight = 0.05;
  const totalR2 = activeModels.reduce((sum, m) => sum + Math.max(minWeight, m.r2), 0);
  for (const model of activeModels) {
    model.weight = Math.max(minWeight, model.r2) / totalR2;
  }
  for (const model of models) {
    if (!activeModels.includes(model)) model.weight = 0;
  }

  let macroAdjustment = 0;
  if (macroFactors && macroFactors.dataSource === "live") {
    const rateDiff = macroFactors.baseRate - ECONOMIC_DEFAULTS.baseInterestRate;
    macroAdjustment = -rateDiff * 0.005;
  }

  const ensemble: ScenarioPredictions = {
    "1y": Math.round(activeModels.reduce((sum, m) => sum + m.prediction["1y"] * m.weight, 0) * (1 + macroAdjustment)),
    "5y": Math.round(activeModels.reduce((sum, m) => sum + m.prediction["5y"] * m.weight, 0) * (1 + macroAdjustment * 0.5)),
    "10y": Math.round(activeModels.reduce((sum, m) => sum + m.prediction["10y"] * m.weight, 0)),
  };

  const dominant = activeModels.reduce((max, m) => m.weight > max.weight ? m : max);

  const periods: Array<"1y" | "5y" | "10y"> = ["1y", "5y", "10y"];
  const cvValues = periods.map((p) => {
    const preds = activeModels.map((m) => m.prediction[p]);
    const mean = preds.reduce((a, b) => a + b, 0) / preds.length;
    if (mean === 0) return 0;
    const variance = preds.reduce((sum, v) => sum + (v - mean) ** 2, 0) / preds.length;
    return Math.sqrt(variance) / Math.abs(mean);
  });
  const avgCv = cvValues.reduce((a, b) => a + b, 0) / cvValues.length;
  const modelAgreement = Math.max(0, Math.min(1, 1 - avgCv));

  return {
    models,
    ensemble,
    dominantModel: dominant.modelName,
    modelAgreement,
  };
}
