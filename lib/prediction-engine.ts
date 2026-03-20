/**
 * VESTRA 자산가치 전망 엔진 (Value Prediction Engine)
 * ───────────────────────────────────────────────────
 * MOLIT 실거래 데이터 기반 시계열 분석 + 시나리오 모델링.
 * LLM 없이 통계적 방법으로 1년/5년/10년 가격 전망 산출.
 */

import type { RealTransaction, RentPriceResult } from "./molit-api";
import type { ModelResult, EnsemblePredictionResult } from "./patent-types";

// ─── 타입 정의 ───

export interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface ScenarioPredictions {
  "1y": number;
  "5y": number;
  "10y": number;
}

export interface MonthlyPrediction {
  month: number;
  price: number;
  confidence: number;
}

export interface MacroEconomicFactors {
  baseRate: number;
  baseRateDate: string;
  supplyVolume?: number;
  supplyRegion?: string;
  dataSource: "live" | "fallback";
  // 한국부동산원 시장 데이터 (v2.5)
  rebSaleChangeRate?: number;   // 매매가격지수 변동률 (%)
  rebJeonseChangeRate?: number; // 전세가격지수 변동률 (%)
  rebMarketTrend?: "상승" | "하락" | "보합";
  // 건축물대장 데이터 (v2.5)
  buildingAge?: number;         // 건물 연식 (년)
  buildingFloors?: number;      // 층수
  buildingHouseholds?: number;  // 세대수
  // 교차 검증 (v2.5)
  crossValidation?: {
    confidence: "high" | "medium" | "low";
    deviation: number;
  };
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

// ─── 경제 지표 (2026 기준) ───

const ECONOMIC_DEFAULTS = {
  baseInterestRate: 2.75,    // 한국은행 기준금리 (%)
  inflationRate: 0.025,      // 연간 인플레이션 (2.5%)
  gdpGrowth: 0.02,           // 실질 GDP 성장률 (2%)
  longTermAvgGrowth: 0.03,   // 부동산 장기 평균 성장률 (3%)
};

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

  // 거래를 시간순으로 정렬
  const sorted = [...transactions].sort(
    (a, b) =>
      a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay -
      (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
  );

  // 가장 이른 거래 기준 개월 수 계산
  const earliest = sorted[0];
  const earliestDate = new Date(earliest.dealYear, earliest.dealMonth - 1, earliest.dealDay);

  const points = sorted.map((tx) => {
    const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
    const months = (txDate.getTime() - earliestDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    return { x: months, y: tx.dealAmount };
  });

  // 단순 선형회귀: y = slope * x + intercept
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // 연간 성장률 계산
  const avgPrice = sumY / n;
  const annualGrowthRate = avgPrice > 0 ? (slope * 12) / avgPrice : 0;

  return {
    annualGrowthRate: Math.max(-0.20, Math.min(0.30, annualGrowthRate)), // cap ±20~30%
    r2,
    slope,
    intercept,
    dataPoints: n,
  };
}

// ─── 평균회귀 모델 ───

function meanReversionModel(
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

  // 평균회귀율: 가격이 평균에서 벗어난 만큼 반대 방향으로 회귀
  const reversionRate = -0.3 * deviation;
  const inflation = ECONOMIC_DEFAULTS.inflationRate;

  const predict = (years: number) =>
    Math.round(currentPrice * Math.pow(1 + reversionRate, years) * Math.pow(1 + inflation, years));

  // R² 근사: 편차가 작을수록 평균회귀 모델 적합도 높음
  const r2 = Math.max(0, Math.min(1, 1 - Math.abs(deviation)));

  return {
    prediction: { "1y": predict(1), "5y": predict(5), "10y": predict(10) },
    r2,
  };
}

// ─── 모멘텀 모델 ───

function momentumModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
): { prediction: ScenarioPredictions; r2: number } {
  if (transactions.length < 3 || currentPrice <= 0) {
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  // 최근 6개월 거래만으로 단기 추세 계산
  const now = new Date();
  const recentTxs = transactions.filter((tx) => {
    const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
    const monthsAgo = (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    return monthsAgo <= 6;
  });

  const recentGrowth = recentTxs.length >= 2
    ? calculateTrend(recentTxs).annualGrowthRate
    : trend.annualGrowthRate;

  // 모멘텀 감쇠: 시간이 지날수록 현재 추세의 영향력 감소
  const predict = (years: number) => {
    const decayFactor = Math.exp(-0.15 * years);
    const rate = recentGrowth * decayFactor;
    return Math.round(currentPrice * Math.pow(1 + rate, years));
  };

  // R²: 추세 일관성 × 최근 데이터 보너스
  const recencyBonus = recentTxs.length >= 3 ? 1.0 : recentTxs.length >= 2 ? 0.7 : 0.3;
  const r2 = Math.max(0, Math.min(1, trend.r2 * recencyBonus));

  return {
    prediction: { "1y": predict(1), "5y": predict(5), "10y": predict(10) },
    r2,
  };
}

// ─── 앙상블 결합 ───

function buildEnsemble(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
): EnsemblePredictionResult {
  // 3개 모델 실행
  const linearPred: ScenarioPredictions = {
    "1y": compoundGrowth(currentPrice, trend.annualGrowthRate, 1),
    "5y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.85, 5),
    "10y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3, 10),
  };

  const meanRev = meanReversionModel(currentPrice, transactions);
  const momentum = momentumModel(currentPrice, transactions, trend);

  const models: ModelResult[] = [
    { modelName: "linear", prediction: linearPred, r2: trend.r2, weight: 0 },
    { modelName: "meanReversion", prediction: meanRev.prediction, r2: meanRev.r2, weight: 0 },
    { modelName: "momentum", prediction: momentum.prediction, r2: momentum.r2, weight: 0 },
  ];

  // R² 기반 동적 가중치 (최소 가중치 0.1 보장)
  const minWeight = 0.1;
  const totalR2 = models.reduce((sum, m) => sum + Math.max(minWeight, m.r2), 0);
  for (const model of models) {
    model.weight = Math.max(minWeight, model.r2) / totalR2;
  }

  // 앙상블 예측 (가중 평균)
  const ensemble: ScenarioPredictions = {
    "1y": Math.round(models.reduce((sum, m) => sum + m.prediction["1y"] * m.weight, 0)),
    "5y": Math.round(models.reduce((sum, m) => sum + m.prediction["5y"] * m.weight, 0)),
    "10y": Math.round(models.reduce((sum, m) => sum + m.prediction["10y"] * m.weight, 0)),
  };

  // 지배적 모델
  const dominant = models.reduce((max, m) => m.weight > max.weight ? m : max);

  // 모델 합의도: 1 - 변동계수 (예측값 분산이 작을수록 합의도 높음)
  const periods: Array<"1y" | "5y" | "10y"> = ["1y", "5y", "10y"];
  const cvValues = periods.map((p) => {
    const preds = models.map((m) => m.prediction[p]);
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

// ─── 시나리오 모델링 ───

/** 복리 성장 적용 */
function compoundGrowth(price: number, annualRate: number, years: number): number {
  return Math.round(price * Math.pow(1 + annualRate, years));
}

/** 시나리오별 예측 생성 */
function generateScenarios(
  currentPrice: number,
  trend: TrendResult,
): PredictionResult["predictions"] {
  const baseRate = trend.dataPoints >= 3
    ? trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.longTermAvgGrowth * 0.3 // 역사적 추세 70% + 장기 평균 30%
    : ECONOMIC_DEFAULTS.longTermAvgGrowth; // 데이터 부족 시 장기 평균 사용

  // 기본 시나리오: 평균회귀 감쇠 적용
  const base1y = baseRate;
  const base5y = baseRate * 0.85; // 5년은 평균회귀 15%
  const base10y = baseRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3; // 10년은 인플레이션 블렌딩

  // 낙관 시나리오: 기본 * 1.3 (금리인하, 개발호재)
  const optimisticMultiplier = 1.3;
  const opt1y = Math.max(base1y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.02);
  const opt5y = Math.max(base5y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.015);
  const opt10y = Math.max(base10y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.01);

  // 비관 시나리오: 기본 * 0.5 (금리인상, 공급과잉)
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

  // 금리 전망
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

  // 지역 가격 추세
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

  // 거래량
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

  // 전세가율 리스크
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

  // 인플레이션 헤지
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

  // 거래 건수 기반 (최대 40점)
  let score = Math.min(transactionCount * 5, 40);

  // 추세 일관성 (R² 기반, 최대 30점)
  score += r2 * 30;

  // 데이터 최근성 (최대 15점)
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

  // 최소 30 (데이터 있으면), 최대 90 (예측은 본질적으로 불확실)
  return Math.min(Math.max(Math.round(score), transactionCount > 0 ? 30 : 0), 90);
}

// ─── 월별 시계열 변환 유틸 ───

export interface MonthlyTimeSeries {
  yearMonth: string;   // "YYYY-MM"
  avgPrice: number;
  count: number;
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

// ─── ARIMA(1,1,1) 모델 ───

function arimaModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
): { prediction: ScenarioPredictions; r2: number } {
  const series = toMonthlyTimeSeries(transactions);
  if (series.length < 12) {
    // 데이터 부족: 폴백
    return {
      prediction: { "1y": currentPrice, "5y": currentPrice, "10y": currentPrice },
      r2: 0,
    };
  }

  const prices = series.map((s) => s.avgPrice);

  // 1차 차분 → 정상화
  const diff: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    diff.push(prices[i] - prices[i - 1]);
  }

  // AR(1) 계수 추정: diff[t] = phi * diff[t-1] + error
  let sumXY = 0, sumX2 = 0;
  for (let i = 1; i < diff.length; i++) {
    sumXY += diff[i] * diff[i - 1];
    sumX2 += diff[i - 1] * diff[i - 1];
  }
  const phi = sumX2 > 0 ? Math.max(-0.95, Math.min(0.95, sumXY / sumX2)) : 0;

  // MA(1) 계수 추정: 잔차의 자기상관
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

  // 예측: 차분 기반 n-step ahead
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
      prevResidual = 0; // 미래 잔차는 0 (기대값)
      prevDiff = nextDiff;
    }
    return Math.max(price, currentPrice * 0.3); // 하한 보호
  };

  // R² 근사: 차분 예측의 설명력
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

// ─── ETS(A,A,A) 모델 — Holt-Winters 3중 지수평활 ───

function etsModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
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

  // 파라미터
  const alpha = 0.3; // 레벨
  const beta = 0.1;  // 추세
  const gamma = series.length >= 24 ? 0.15 : 0; // 계절성 (24개월 미만이면 비활성)

  // 초기값
  let level = prices.slice(0, Math.min(seasonLength, n)).reduce((a, b) => a + b, 0)
    / Math.min(seasonLength, n);
  let trendVal = n >= 2 ? (prices[Math.min(seasonLength, n) - 1] - prices[0])
    / Math.min(seasonLength, n) : 0;

  // 초기 계절 인덱스
  const seasonal: number[] = new Array(seasonLength).fill(0);
  if (gamma > 0 && n >= seasonLength) {
    for (let i = 0; i < seasonLength; i++) {
      seasonal[i] = prices[i] - level;
    }
  }

  // 적합 (fitting)
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

  // 예측
  const forecast = (months: number): number => {
    let price = level + trendVal * months;
    if (gamma > 0) {
      price += seasonal[(n + months - 1) % seasonLength];
    }
    return Math.max(price, currentPrice * 0.3);
  };

  // R² 계산
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

function buildEnsembleV2(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
  macroFactors?: MacroEconomicFactors,
): EnsemblePredictionResult {
  // 기존 3모델
  const linearPred: ScenarioPredictions = {
    "1y": compoundGrowth(currentPrice, trend.annualGrowthRate, 1),
    "5y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.85, 5),
    "10y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3, 10),
  };
  const meanRev = meanReversionModel(currentPrice, transactions);
  const momentum = momentumModel(currentPrice, transactions, trend);

  // 신규 모델
  const arima = arimaModel(currentPrice, transactions, trend);
  const ets = etsModel(currentPrice, transactions, trend);

  const models: ModelResult[] = [
    { modelName: "linear", prediction: linearPred, r2: trend.r2, weight: 0 },
    { modelName: "meanReversion", prediction: meanRev.prediction, r2: meanRev.r2, weight: 0 },
    { modelName: "momentum", prediction: momentum.prediction, r2: momentum.r2, weight: 0 },
    { modelName: "arima", prediction: arima.prediction, r2: arima.r2, weight: 0 },
    { modelName: "ets", prediction: ets.prediction, r2: ets.r2, weight: 0 },
  ];

  // 데이터 부족 시 ARIMA/ETS 제외 (r2=0이면 기여 없음)
  const activeModels = models.filter((m) => m.r2 > 0 || ["linear", "meanReversion", "momentum"].includes(m.modelName));

  // R² 기반 동적 가중치 (최소 0.05)
  const minWeight = 0.05;
  const totalR2 = activeModels.reduce((sum, m) => sum + Math.max(minWeight, m.r2), 0);
  for (const model of activeModels) {
    model.weight = Math.max(minWeight, model.r2) / totalR2;
  }
  // 비활성 모델은 가중치 0
  for (const model of models) {
    if (!activeModels.includes(model)) model.weight = 0;
  }

  // 거시경제 보정: 실시간 금리가 있으면 약간의 조정
  let macroAdjustment = 0;
  if (macroFactors && macroFactors.dataSource === "live") {
    const rateDiff = macroFactors.baseRate - ECONOMIC_DEFAULTS.baseInterestRate;
    macroAdjustment = -rateDiff * 0.005; // 금리 1%p 상승 → -0.5% 보정
  }

  // 앙상블 예측
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

// ─── 시장 사이클 탐지 ───

export function detectMarketCycle(transactions: RealTransaction[]): MarketCycleInfo {
  const series = toMonthlyTimeSeries(transactions);
  if (series.length < 6) {
    return { phase: "횡보", confidence: 30, durationMonths: 0, signal: "데이터 부족" };
  }

  // 최근 6개월 추세
  const recent6 = series.slice(-6);
  const older = series.slice(-12, -6);

  const recentAvg = recent6.reduce((s, m) => s + m.avgPrice, 0) / recent6.length;
  const olderAvg = older.length > 0
    ? older.reduce((s, m) => s + m.avgPrice, 0) / older.length
    : recentAvg;

  const changeRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  // 거래량 변화
  const recentVolume = recent6.reduce((s, m) => s + m.count, 0);
  const olderVolume = older.length > 0 ? older.reduce((s, m) => s + m.count, 0) : recentVolume;
  const volumeChange = olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;

  // 연속 상승/하락 개월 수
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

  // 계절성 패턴 추출 (있으면)
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
    const confidence = Math.round(baseConfidence - m * 2); // 멀수록 불확실
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
  // 거시경제 데이터가 있으면 ECONOMIC_DEFAULTS 대체
  const effectiveRate = macroFactors?.dataSource === "live"
    ? macroFactors.baseRate
    : ECONOMIC_DEFAULTS.baseInterestRate;

  // 추세 분석
  const trend = calculateTrend(transactions);

  // 시나리오 예측
  const predictions = generateScenarios(currentPrice, trend);

  // 영향 요인 분석
  const factors = generateFactors(trend, transactions.length, jeonseRatio);

  // 반영 변수
  const variables = ["기준금리", "인구변동", "공급물량", "정책변화", "경제성장률", "물가상승률"];

  // 신뢰도 (5모델이면 보너스)
  let confidence = calculatePredictionConfidence(transactions.length, trend.r2, transactions);
  if (transactions.length >= 24) confidence = Math.min(90, confidence + 5); // 36개월 데이터 보너스

  // 5모델 앙상블
  const ensemble = buildEnsembleV2(currentPrice, transactions, trend, macroFactors);

  // 시장 사이클
  const marketCycle = detectMarketCycle(transactions);

  // 월별 예측
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
