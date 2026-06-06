/**
 * 시계열 이상탐지 엔진 (Time Series Anomaly Detection Engine)
 *
 * 여러 방법론을 결합하여 false positive를 줄이고 다각적 검증:
 * - 이중 지수 평활법 (Holt's method)
 * - 적응형 Bollinger Band
 * - CUSUM 변화점 탐지
 * - 계절성 분해
 * - Robust Z-Score (MAD 기반)
 */

import {
  holtSmoothing, optimizeHoltParams,
  adaptiveBollingerBands, cusumDetection,
  seasonalDecomposition, robustZScore,
} from "./anomaly/statistical-models";

// ─── re-export (기존 import 경로 유지) ───

export {
  holtSmoothing, optimizeHoltParams,
  adaptiveBollingerBands, cusumDetection,
  seasonalDecomposition, robustZScore,
} from "./anomaly/statistical-models";

// ─── 타입 정의 ───

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface AnomalyResult {
  index: number;
  timestamp: number;
  value: number;
  expected: number;
  deviation: number;
  type: 'spike' | 'dip' | 'trend_break' | 'level_shift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface ChangePoint {
  index: number;
  timestamp: number;
  direction: 'increase' | 'decrease';
  magnitude: number;
  cumulativeSum: number;
}

export interface SeasonalComponent {
  trend: number[];
  seasonal: number[];
  residual: number[];
  period: number;
}

export interface AnomalyDetectionReport {
  anomalies: AnomalyResult[];
  changePoints: ChangePoint[];
  seasonal: SeasonalComponent | null;
  statistics: {
    mean: number;
    median: number;
    mad: number;
    volatility: number;
    trendDirection: 'up' | 'down' | 'stable';
    trendStrength: number;
  };
  smoothedSeries: number[];
  upperBand: number[];
  lowerBand: number[];
}

// ─── 통합 이상탐지 파이프라인 ───

/**
 * 부동산 시계열 데이터에 대한 종합 이상탐지
 *
 * 1. Holt 평활로 예측값 생성
 * 2. 적응형 Bollinger Band로 정상 범위 설정
 * 3. Robust Z-Score로 이상치 스코어링
 * 4. CUSUM으로 변화점 탐지
 * 5. 계절성 분해로 구조적 패턴 분리
 */
export function detectAnomalies(
  data: TimeSeriesPoint[],
  options: {
    bollingerWindow?: number;
    bollingerMultiplier?: number;
    cusumThreshold?: number;
    seasonalPeriod?: number;
    zScoreThreshold?: number;
  } = {},
): AnomalyDetectionReport {
  const {
    bollingerWindow = 20,
    bollingerMultiplier = 2.0,
    seasonalPeriod = 12,
    zScoreThreshold = 3.5,
  } = options;

  if (data.length < 3) {
    const values = data.map(d => d.value);
    const mean = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return {
      anomalies: [],
      changePoints: [],
      seasonal: null,
      statistics: { mean, median: mean, mad: 0, volatility: 0, trendDirection: 'stable', trendStrength: 0 },
      smoothedSeries: values,
      upperBand: values,
      lowerBand: values,
    };
  }

  const values = data.map(d => d.value);

  // 1. Holt 평활
  const { alpha, beta } = optimizeHoltParams(values);
  const { smoothed } = holtSmoothing(values, alpha, beta);

  // 2. 적응형 Bollinger Band
  const bands = adaptiveBollingerBands(values, bollingerWindow, bollingerMultiplier);

  // 3. Robust Z-Score
  const { scores: zScores, median, mad } = robustZScore(values);

  // 4. CUSUM 변화점
  const rawChangePoints = cusumDetection(values, options.cusumThreshold);
  const changePoints = rawChangePoints.map(cp => ({
    ...cp,
    timestamp: data[cp.index]?.timestamp || 0,
  }));

  // 5. 계절성 분해
  const seasonal = seasonalDecomposition(values, seasonalPeriod);

  // 6. 이상치 식별 (다중 기준 교차 검증)
  const anomalies: AnomalyResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const expected = smoothed[i];
    const zScore = zScores[i];
    const aboveUpper = value > bands.upper[i];
    const belowLower = value < bands.lower[i];
    const isZScoreAnomaly = Math.abs(zScore) > zScoreThreshold;

    let signals = 0;
    if (aboveUpper || belowLower) signals++;
    if (isZScoreAnomaly) signals++;
    if (seasonal?.residual[i] && Math.abs(seasonal.residual[i]) > 2 * mad) signals++;

    if (signals >= 2) {
      const deviation = Math.abs(zScore);
      const type = classifyAnomalyType(values, i, changePoints);
      const severity = classifySeverity(deviation);

      anomalies.push({
        index: i,
        timestamp: data[i].timestamp,
        value,
        expected,
        deviation,
        type,
        severity,
        confidence: Math.min(1, signals / 3),
      });
    }
  }

  // 7. 통계 요약
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const volatility = Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  ) / Math.abs(mean || 1);

  const lastSmoothed = smoothed[smoothed.length - 1];
  const firstSmoothed = smoothed[0];
  const trendChange = lastSmoothed - firstSmoothed;
  const trendStrength = Math.min(1, Math.abs(trendChange) / (Math.abs(mean) || 1));
  const trendDirection: 'up' | 'down' | 'stable' =
    trendChange > mean * 0.05 ? 'up' :
    trendChange < -mean * 0.05 ? 'down' : 'stable';

  return {
    anomalies,
    changePoints,
    seasonal,
    statistics: {
      mean,
      median,
      mad,
      volatility,
      trendDirection,
      trendStrength,
    },
    smoothedSeries: smoothed,
    upperBand: bands.upper,
    lowerBand: bands.lower,
  };
}

// ─── 분류 유틸리티 ───

function classifyAnomalyType(
  series: number[],
  index: number,
  changePoints: ChangePoint[],
): AnomalyResult['type'] {
  const isNearChangePoint = changePoints.some(cp => Math.abs(cp.index - index) <= 2);
  if (isNearChangePoint) return 'level_shift';

  const prev = index > 0 ? series[index - 1] : series[index];
  const next = index < series.length - 1 ? series[index + 1] : series[index];
  const current = series[index];

  const avgNeighbor = (prev + next) / 2;
  const diff = current - avgNeighbor;

  if (Math.abs(diff) > Math.abs(avgNeighbor) * 0.1) {
    return diff > 0 ? 'spike' : 'dip';
  }

  return 'trend_break';
}

function classifySeverity(deviation: number): AnomalyResult['severity'] {
  if (deviation >= 5) return 'critical';
  if (deviation >= 4) return 'high';
  if (deviation >= 3) return 'medium';
  return 'low';
}
