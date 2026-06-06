/**
 * 시계열 이상탐지 통계 모델 모음
 * Holt 평활, Bollinger Band, CUSUM, 계절성 분해, Robust Z-Score
 *
 * @module lib/anomaly/statistical-models
 */

import type { ChangePoint, SeasonalComponent } from "../anomaly-detector";

// ─── 이중 지수 평활법 (Holt's Linear Method) ───

interface HoltState {
  level: number;
  trend: number;
}

/**
 * Holt's Double Exponential Smoothing
 *
 * l_t = α * y_t + (1 - α) * (l_{t-1} + b_{t-1})
 * b_t = β * (l_t - l_{t-1}) + (1 - β) * b_{t-1}
 * ŷ_{t+h} = l_t + h * b_t
 */
export function holtSmoothing(
  series: number[],
  alpha: number = 0.3,
  beta: number = 0.1,
): { smoothed: number[]; forecasts: (steps: number) => number[] } {
  if (series.length < 2) {
    return {
      smoothed: [...series],
      forecasts: (steps) => Array(steps).fill(series[0] || 0),
    };
  }

  const states: HoltState[] = [];
  states[0] = {
    level: series[0],
    trend: series[1] - series[0],
  };

  const smoothed: number[] = [series[0]];

  for (let t = 1; t < series.length; t++) {
    const prev = states[t - 1];
    const level = alpha * series[t] + (1 - alpha) * (prev.level + prev.trend);
    const trend = beta * (level - prev.level) + (1 - beta) * prev.trend;

    states[t] = { level, trend };
    smoothed[t] = level;
  }

  const lastState = states[states.length - 1];

  return {
    smoothed,
    forecasts: (steps: number) => {
      const result: number[] = [];
      for (let h = 1; h <= steps; h++) {
        result.push(lastState.level + h * lastState.trend);
      }
      return result;
    },
  };
}

/** 최적 α, β 파라미터 자동 탐색 (Grid Search + MSE 최소화) */
export function optimizeHoltParams(
  series: number[],
  gridStep: number = 0.1,
): { alpha: number; beta: number; mse: number } {
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestMse = Infinity;

  for (let a = 0.1; a <= 0.9; a += gridStep) {
    for (let b = 0.01; b <= 0.5; b += gridStep) {
      const { smoothed } = holtSmoothing(series, a, b);
      let mse = 0;
      for (let i = 1; i < series.length; i++) {
        mse += (series[i] - smoothed[i]) ** 2;
      }
      mse /= (series.length - 1);

      if (mse < bestMse) {
        bestMse = mse;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  return { alpha: bestAlpha, beta: bestBeta, mse: bestMse };
}

// ─── 적응형 Bollinger Band ───

/**
 * 변동성에 따라 밴드 폭을 동적 조절
 * - 변동성 높을 때 → 밴드 넓힘 (false positive 감소)
 * - 변동성 낮을 때 → 밴드 좁힘 (민감도 증가)
 */
export function adaptiveBollingerBands(
  series: number[],
  window: number = 20,
  baseMultiplier: number = 2.0,
): { upper: number[]; lower: number[]; middle: number[]; bandwidth: number[] } {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowSlice = series.slice(start, i + 1);

    const mean = windowSlice.reduce((s, v) => s + v, 0) / windowSlice.length;
    const std = Math.sqrt(
      windowSlice.reduce((s, v) => s + (v - mean) ** 2, 0) / windowSlice.length
    );

    const cv = mean !== 0 ? std / Math.abs(mean) : 0;
    const adaptiveMultiplier = baseMultiplier * (1 + cv);

    middle.push(mean);
    upper.push(mean + adaptiveMultiplier * std);
    lower.push(mean - adaptiveMultiplier * std);
    bandwidth.push(std > 0 ? (upper[i] - lower[i]) / middle[i] : 0);
  }

  return { upper, lower, middle, bandwidth };
}

// ─── CUSUM 변화점 탐지 ───

/**
 * CUSUM (Cumulative Sum Control Chart)
 *
 * S_t^+ = max(0, S_{t-1}^+ + (x_t - μ - k))
 * S_t^- = max(0, S_{t-1}^- - (x_t - μ - k))
 * 변화점: S_t^+ > h 또는 S_t^- > h
 */
export function cusumDetection(
  series: number[],
  threshold?: number,
  drift?: number,
): ChangePoint[] {
  if (series.length < 5) return [];

  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const std = Math.sqrt(
    series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length
  );

  const h = threshold ?? 4 * std;
  const k = drift ?? 0.5 * std;

  const changePoints: ChangePoint[] = [];
  let sPlus = 0;
  let sMinus = 0;

  for (let i = 0; i < series.length; i++) {
    sPlus = Math.max(0, sPlus + (series[i] - mean - k));
    sMinus = Math.max(0, sMinus - (series[i] - mean) + k);

    if (sPlus > h) {
      changePoints.push({
        index: i,
        timestamp: 0,
        direction: 'increase',
        magnitude: sPlus / std,
        cumulativeSum: sPlus,
      });
      sPlus = 0;
    }

    if (sMinus > h) {
      changePoints.push({
        index: i,
        timestamp: 0,
        direction: 'decrease',
        magnitude: sMinus / std,
        cumulativeSum: sMinus,
      });
      sMinus = 0;
    }
  }

  return changePoints;
}

// ─── 계절성 분해 (Additive Decomposition) ───

/**
 * Y_t = T_t + S_t + R_t
 * 1) 이동평균으로 추세(T) 추출
 * 2) 원본 - 추세 = 계절성+잔차
 * 3) 주기별 평균으로 계절성(S) 추출
 * 4) 잔차(R) = 원본 - 추세 - 계절성
 */
export function seasonalDecomposition(
  series: number[],
  period: number = 12,
): SeasonalComponent | null {
  if (series.length < period * 2) return null;

  const trend: number[] = [];
  const halfPeriod = Math.floor(period / 2);

  for (let i = 0; i < series.length; i++) {
    if (i < halfPeriod || i >= series.length - halfPeriod) {
      trend.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
        sum += series[j];
      }
      trend.push(sum / (period + (period % 2 === 0 ? 0 : 1)));
    }
  }

  const firstValidIdx = trend.findIndex(v => !isNaN(v));
  const lastValidIdx = trend.length - 1 - [...trend].reverse().findIndex(v => !isNaN(v));

  for (let i = 0; i < firstValidIdx; i++) {
    trend[i] = trend[firstValidIdx];
  }
  for (let i = lastValidIdx + 1; i < trend.length; i++) {
    trend[i] = trend[lastValidIdx];
  }

  const detrended = series.map((v, i) => v - trend[i]);

  const seasonalAvg: number[] = new Array(period).fill(0);
  const counts: number[] = new Array(period).fill(0);

  for (let i = 0; i < detrended.length; i++) {
    const phase = i % period;
    seasonalAvg[phase] += detrended[i];
    counts[phase]++;
  }

  for (let i = 0; i < period; i++) {
    seasonalAvg[i] = counts[i] > 0 ? seasonalAvg[i] / counts[i] : 0;
  }

  const seasonalMean = seasonalAvg.reduce((s, v) => s + v, 0) / period;
  for (let i = 0; i < period; i++) {
    seasonalAvg[i] -= seasonalMean;
  }

  const seasonal = series.map((_, i) => seasonalAvg[i % period]);
  const residual = series.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual, period };
}

// ─── Robust Z-Score (MAD 기반) ───

/**
 * Modified Z-Score = 0.6745 * (x_i - median) / MAD
 * |MZ| > 3.5이면 이상치
 */
export function robustZScore(series: number[]): { scores: number[]; median: number; mad: number } {
  if (series.length === 0) return { scores: [], median: 0, mad: 0 };

  const sorted = [...series].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const deviations = series.map(v => Math.abs(v - median));
  const sortedDev = [...deviations].sort((a, b) => a - b);
  const mad = sortedDev.length % 2 === 0
    ? (sortedDev[sortedDev.length / 2 - 1] + sortedDev[sortedDev.length / 2]) / 2
    : sortedDev[Math.floor(sortedDev.length / 2)];

  const scores = mad > 0
    ? series.map(v => 0.6745 * (v - median) / mad)
    : series.map(() => 0);

  return { scores, median, mad };
}
