/**
 * VESTRA 자산가치 전망 엔진 (Value Prediction Engine)
 * ───────────────────────────────────────────────────
 * MOLIT 실거래 데이터 기반 시계열 분석 + 시나리오 모델링.
 * LLM 없이 통계적 방법으로 1년/5년/10년 가격 전망 산출.
 */

import type { RealTransaction, RentPriceResult } from "./molit-api";
import type { EnsemblePredictionResult } from "./patent-types";
import {
  ECONOMIC_DEFAULTS, compoundGrowth, toMonthlyTimeSeries, buildEnsembleV2,
} from "./prediction/forecasting-models";
import type { ScenarioPredictions, MacroEconomicFactors } from "./prediction/forecasting-models";

// ─── re-export (기존 import 경로 유지) ───

export {
  ECONOMIC_DEFAULTS, compoundGrowth, toMonthlyTimeSeries,
  meanReversionModel, momentumModel, arimaModel, etsModel, buildEnsembleV2,
} from "./prediction/forecasting-models";

export type {
  ScenarioPredictions, MacroEconomicFactors, MonthlyTimeSeries,
} from "./prediction/forecasting-models";

// ─── 타입 정의 ───

export interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface MonthlyPrediction {
  month: number;
  price: number;
  confidence: number;
}

export interface BacktestResult {
  mape: number;
  rmse: number;
  accuracy12m: number;
  sampleCount: number;
  period: string;
}

export interface MarketCycleInfo {
  phase: "상승" | "하락" | "횡보" | "회복";
  confidence: number;
  durationMonths: number;
  signal: string;
}

export interface PredictionResult {
  currentPrice: number;
  predictions: {
    optimistic: ScenarioPredictions;
    base: ScenarioPredictions;
    pessimistic: ScenarioPredictions;
  };
  variables: string[];
  factors: PredictionFactor[];
  confidence: number;
  ensemble?: EnsemblePredictionResult;
  monthlyForecast?: MonthlyPrediction[];
  macroFactors?: MacroEconomicFactors;
  backtestResult?: BacktestResult;
  marketCycle?: MarketCycleInfo;
}

interface TrendResult {
  annualGrowthRate: number;
  r2: number;
  slope: number;
  intercept: number;
  dataPoints: number;
}

// ─── 추세 분석 ───

/** 거래 데이터로부터 선형회귀 추세 분석 */
export function calculateTrend(transactions: RealTransaction[]): TrendResult {
  if (transactions.length === 0) {
    return { annualGrowthRate: 0, r2: 0, slope: 0, intercept: 0, dataPoints: 0 };
  }

  if (transactions.length === 1) {
    return {
      annualGrowthRate: 0,
      r2: 0,
      slope: 0,
      intercept: transactions[0].dealAmount,
      dataPoints: 1,
    };
  }

  const sorted = [...transactions].sort(
    (a, b) =>
      a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay -
      (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
  );

  const earliest = sorted[0];
  const earliestDate = new Date(earliest.dealYear, earliest.dealMonth - 1, earliest.dealDay);

  const points = sorted.map((tx) => {
    const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
    const months = (txDate.getTime() - earliestDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    return { x: months, y: tx.dealAmount };
  });

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const avgPrice = sumY / n;
  const annualGrowthRate = avgPrice > 0 ? (slope * 12) / avgPrice : 0;

  return {
    annualGrowthRate: Math.max(-0.20, Math.min(0.30, annualGrowthRate)),
    r2,
    slope,
    intercept,
    dataPoints: n,
  };
}

// ─── 시나리오 모델링 ───

/** 시나리오별 예측 생성 */
function generateScenarios(
  currentPrice: number,
  trend: TrendResult,
): PredictionResult["predictions"] {
  const baseRate = trend.dataPoints >= 3
    ? trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.longTermAvgGrowth * 0.3
    : ECONOMIC_DEFAULTS.longTermAvgGrowth;

  const base1y = baseRate;
  const base5y = baseRate * 0.85;
  const base10y = baseRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3;

  const optimisticMultiplier = 1.3;
  const opt1y = Math.max(base1y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.02);
  const opt5y = Math.max(base5y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.015);
  const opt10y = Math.max(base10y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.01);

  const pessimisticMultiplier = 0.5;
  const pes1y = Math.max(base1y * pessimisticMultiplier, -0.05);
  const pes5y = Math.max(base5y * pessimisticMultiplier, -0.03);
  const pes10y = Math.max(base10y * pessimisticMultiplier, -0.01);

  return {
    optimistic: {
      "1y": compoundGrowth(currentPrice, opt1y, 1),
      "5y": compoundGrowth(currentPrice, opt5y, 5),
      "10y": compoundGrowth(currentPrice, opt10y, 10),
    },
    base: {
      "1y": compoundGrowth(currentPrice, base1y, 1),
      "5y": compoundGrowth(currentPrice, base5y, 5),
      "10y": compoundGrowth(currentPrice, base10y, 10),
    },
    pessimistic: {
      "1y": compoundGrowth(currentPrice, pes1y, 1),
      "5y": compoundGrowth(currentPrice, pes5y, 5),
      "10y": compoundGrowth(currentPrice, pes10y, 10),
    },
  };
}

// ─── 영향 요인 분석 ───

function generateFactors(
  trend: TrendResult,
  transactionCount: number,
  jeonseRatio: number | null,
): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (ECONOMIC_DEFAULTS.baseInterestRate >= 3.0) {
    factors.push({
      name: "금리 전망",
      impact: "negative",
      description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 높은 수준이며, 대출 부담으로 매수세 약화 가능성`,
    });
  } else if (ECONOMIC_DEFAULTS.baseInterestRate <= 2.0) {
    factors.push({
      name: "금리 전망",
      impact: "positive",
      description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 저금리 환경이 부동산 수요를 촉진`,
    });
  } else {
    factors.push({
      name: "금리 전망",
      impact: "neutral",
      description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 중립적 수준, 향후 금리 방향에 따라 변동 가능`,
    });
  }

  if (trend.annualGrowthRate > 0.05) {
    factors.push({
      name: "지역 가격 추세",
      impact: "positive",
      description: `최근 실거래 기준 연 ${(trend.annualGrowthRate * 100).toFixed(1)}% 상승 추세로 가격 상승 모멘텀 존재`,
    });
  } else if (trend.annualGrowthRate < -0.02) {
    factors.push({
      name: "지역 가격 추세",
      impact: "negative",
      description: `최근 실거래 기준 연 ${(trend.annualGrowthRate * 100).toFixed(1)}% 하락 추세로 가격 조정 중`,
    });
  } else {
    factors.push({
      name: "지역 가격 추세",
      impact: "neutral",
      description: `최근 실거래 기준 가격 변동이 크지 않은 안정적 시세 (연 ${(trend.annualGrowthRate * 100).toFixed(1)}%)`,
    });
  }

  if (transactionCount >= 20) {
    factors.push({
      name: "거래 활성도",
      impact: "positive",
      description: `최근 12개월 ${transactionCount}건 거래로 유동성이 풍부한 시장`,
    });
  } else if (transactionCount <= 5) {
    factors.push({
      name: "거래 활성도",
      impact: "negative",
      description: `최근 12개월 ${transactionCount}건 거래로 유동성이 낮아 매매 시 가격 협상력 제한`,
    });
  } else {
    factors.push({
      name: "거래 활성도",
      impact: "neutral",
      description: `최근 12개월 ${transactionCount}건 거래로 보통 수준의 시장 유동성`,
    });
  }

  if (jeonseRatio !== null && jeonseRatio > 0) {
    if (jeonseRatio >= 75) {
      factors.push({
        name: "전세가율 리스크",
        impact: "negative",
        description: `전세가율 ${jeonseRatio.toFixed(1)}%로 높은 수준, 역전세 리스크 및 가격 하방 압력`,
      });
    } else if (jeonseRatio < 50) {
      factors.push({
        name: "전세가율 안정",
        impact: "positive",
        description: `전세가율 ${jeonseRatio.toFixed(1)}%로 안정적, 갭투자 매력도 낮아 실수요 중심 시장`,
      });
    }
  }

  factors.push({
    name: "인플레이션 헤지",
    impact: "positive",
    description: `연 ${(ECONOMIC_DEFAULTS.inflationRate * 100).toFixed(1)}% 물가상승률 대비 실물자산으로서의 가치 보존 효과`,
  });

  return factors.slice(0, 6);
}

// ─── 신뢰도 계산 ───

function calculatePredictionConfidence(
  transactionCount: number,
  r2: number,
  transactions: RealTransaction[],
): number {
  if (transactionCount === 0) return 0;

  let score = Math.min(transactionCount * 5, 40);
  score += r2 * 30;

  const now = new Date();
  const mostRecentTx = transactions.reduce((latest, tx) => {
    const txVal = tx.dealYear * 10000 + tx.dealMonth * 100 + tx.dealDay;
    const latestVal = latest.dealYear * 10000 + latest.dealMonth * 100 + latest.dealDay;
    return txVal > latestVal ? tx : latest;
  }, transactions[0]);

  if (mostRecentTx) {
    const recentDate = new Date(mostRecentTx.dealYear, mostRecentTx.dealMonth - 1, mostRecentTx.dealDay);
    const monthsAgo = (now.getTime() - recentDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    if (monthsAgo <= 3) score += 15;
    else if (monthsAgo <= 6) score += 10;
    else if (monthsAgo <= 12) score += 5;
  }

  return Math.min(Math.max(Math.round(score), transactionCount > 0 ? 30 : 0), 90);
}

// ─── 시장 사이클 탐지 ───

export function detectMarketCycle(transactions: RealTransaction[]): MarketCycleInfo {
  const series = toMonthlyTimeSeries(transactions);
  if (series.length < 6) {
    return { phase: "횡보", confidence: 30, durationMonths: 0, signal: "데이터 부족" };
  }

  const recent6 = series.slice(-6);
  const older = series.slice(-12, -6);

  const recentAvg = recent6.reduce((s, m) => s + m.avgPrice, 0) / recent6.length;
  const olderAvg = older.length > 0
    ? older.reduce((s, m) => s + m.avgPrice, 0) / older.length
    : recentAvg;

  const changeRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  const recentVolume = recent6.reduce((s, m) => s + m.count, 0);
  const olderVolume = older.length > 0 ? older.reduce((s, m) => s + m.count, 0) : recentVolume;
  const volumeChange = olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;

  let consecutiveUp = 0;
  let consecutiveDown = 0;
  for (let i = series.length - 1; i > 0; i--) {
    if (series[i].avgPrice > series[i - 1].avgPrice) {
      if (consecutiveDown > 0) break;
      consecutiveUp++;
    } else if (series[i].avgPrice < series[i - 1].avgPrice) {
      if (consecutiveUp > 0) break;
      consecutiveDown++;
    } else break;
  }

  let phase: MarketCycleInfo["phase"];
  let signal: string;
  let confidence: number;

  if (changeRate > 0.03 && consecutiveUp >= 3) {
    phase = "상승";
    signal = `6개월 대비 ${(changeRate * 100).toFixed(1)}% 상승, ${consecutiveUp}개월 연속 상승`;
    confidence = Math.min(80, 50 + consecutiveUp * 5 + Math.abs(changeRate) * 100);
  } else if (changeRate < -0.02 && consecutiveDown >= 3) {
    phase = "하락";
    signal = `6개월 대비 ${(changeRate * 100).toFixed(1)}% 하락, ${consecutiveDown}개월 연속 하락`;
    confidence = Math.min(80, 50 + consecutiveDown * 5 + Math.abs(changeRate) * 100);
  } else if (changeRate > 0.01 && volumeChange > 0.1) {
    phase = "회복";
    signal = `소폭 상승(${(changeRate * 100).toFixed(1)}%) + 거래량 증가(${(volumeChange * 100).toFixed(0)}%)`;
    confidence = 45;
  } else {
    phase = "횡보";
    signal = `가격 변동 ${(changeRate * 100).toFixed(1)}%, 뚜렷한 방향성 없음`;
    confidence = 40;
  }

  const durationMonths = Math.max(consecutiveUp, consecutiveDown, 1);

  return { phase, confidence: Math.round(confidence), durationMonths, signal };
}

// ─── 월별 세분화 예측 ───

function generateMonthlyForecast(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
): MonthlyPrediction[] {
  const series = toMonthlyTimeSeries(transactions);
  const monthlyRate = trend.annualGrowthRate / 12;
  const forecasts: MonthlyPrediction[] = [];

  const seasonalPattern = new Array(12).fill(0);
  if (series.length >= 24) {
    const monthGroups = new Map<number, number[]>();
    for (const s of series) {
      const month = parseInt(s.yearMonth.split("-")[1]);
      if (!monthGroups.has(month)) monthGroups.set(month, []);
      monthGroups.get(month)!.push(s.avgPrice);
    }
    const overallAvg = series.reduce((s, m) => s + m.avgPrice, 0) / series.length;
    for (let m = 1; m <= 12; m++) {
      const prices = monthGroups.get(m) || [];
      if (prices.length > 0) {
        const monthAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
        seasonalPattern[m - 1] = (monthAvg - overallAvg) / overallAvg;
      }
    }
  }

  const baseConfidence = Math.min(75, 40 + transactions.length * 0.5);

  for (let m = 1; m <= 12; m++) {
    const basePrice = currentPrice * Math.pow(1 + monthlyRate, m);
    const seasonAdj = 1 + seasonalPattern[(new Date().getMonth() + m) % 12];
    const price = Math.round(basePrice * seasonAdj);
    const confidence = Math.round(baseConfidence - m * 2);
    forecasts.push({ month: m, price, confidence: Math.max(confidence, 20) });
  }

  return forecasts;
}

// ─── 메인 예측 함수 ───

export function predictValue(
  currentPrice: number,
  transactions: RealTransaction[],
  rentData: RentPriceResult | null,
  jeonseRatio: number | null,
  macroFactors?: MacroEconomicFactors,
): PredictionResult {
  const trend = calculateTrend(transactions);
  const predictions = generateScenarios(currentPrice, trend);
  const factors = generateFactors(trend, transactions.length, jeonseRatio);
  const variables = ["기준금리", "인구변동", "공급물량", "정책변화", "경제성장률", "물가상승률"];

  let confidence = calculatePredictionConfidence(transactions.length, trend.r2, transactions);
  if (transactions.length >= 24) confidence = Math.min(90, confidence + 5);

  const ensemble = buildEnsembleV2(currentPrice, transactions, trend, calculateTrend, macroFactors);
  const marketCycle = detectMarketCycle(transactions);
  const monthlyForecast = generateMonthlyForecast(currentPrice, transactions, trend);

  return {
    currentPrice,
    predictions,
    variables,
    factors,
    confidence,
    ensemble,
    monthlyForecast,
    macroFactors,
    marketCycle,
  };
}
