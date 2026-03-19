/**
 * 시계열 이상탐지 엔진 (Time Series Anomaly Detection Engine)
 *
 * 기존 prediction-engine의 선형회귀를 넘어서는 고도화된 시계열 분석:
 * - 이중 지수 평활법 (Double Exponential Smoothing / Holt's method)
 * - 적응형 Bollinger Band 기반 이상탐지
 * - CUSUM (Cumulative Sum) 변화점 탐지
 * - Seasonal Decomposition (계절성 분해)
 * - Robust Z-Score (MAD 기반)
 */

// ============================================================
// 1. 타입 정의
// ============================================================

export interface TimeSeriesPoint {
  timestamp: number; // epoch ms
  value: number;
  label?: string;
}

export interface AnomalyResult {
  index: number;
  timestamp: number;
  value: number;
  expected: number;
  deviation: number; // 표준편차 단위
  type: 'spike' | 'dip' | 'trend_break' | 'level_shift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
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
    mad: number; // Median Absolute Deviation
    volatility: number;
    trendDirection: 'up' | 'down' | 'stable';
    trendStrength: number; // 0-1
  };
  smoothedSeries: number[];
  upperBand: number[];
  lowerBand: number[];
}

// ============================================================
// 2. 이중 지수 평활법 (Holt's Linear Method)
// ============================================================

interface HoltState {
  level: number;
  trend: number;
}

/**
 * Holt's Double Exponential Smoothing
 * 레벨(수준)과 추세를 별도로 추적하여 선형 추세가 있는 시계열 예측
 *
 * l_t = α * y_t + (1 - α) * (l_{t-1} + b_{t-1})  -- 레벨 갱신
 * b_t = β * (l_t - l_{t-1}) + (1 - β) * b_{t-1}   -- 추세 갱신
 * ŷ_{t+h} = l_t + h * b_t                          -- h-step ahead 예측
 */
export function holtSmoothing(
  series: number[],
  alpha: number = 0.3,   // 레벨 평활 계수
  beta: number = 0.1,    // 추세 평활 계수
): { smoothed: number[]; forecasts: (steps: number) => number[] } {
  if (series.length < 2) {
    return {
      smoothed: [...series],
      forecasts: (steps) => Array(steps).fill(series[0] || 0),
    };
  }

  // 초기화: 첫 두 데이터 포인트로 레벨과 추세 설정
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

/**
 * 최적 α, β 파라미터 자동 탐색 (Grid Search + MSE 최소화)
 */
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

// ============================================================
// 3. 적응형 Bollinger Band
// ============================================================

/**
 * 적응형 Bollinger Band
 * 표준 Bollinger Band와 달리 변동성에 따라 밴드 폭을 동적 조절
 *
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

    // 적응형 승수: 변동계수(CV)에 따라 조절
    const cv = mean !== 0 ? std / Math.abs(mean) : 0;
    const adaptiveMultiplier = baseMultiplier * (1 + cv);

    middle.push(mean);
    upper.push(mean + adaptiveMultiplier * std);
    lower.push(mean - adaptiveMultiplier * std);
    bandwidth.push(std > 0 ? (upper[i] - lower[i]) / middle[i] : 0);
  }

  return { upper, lower, middle, bandwidth };
}

// ============================================================
// 4. CUSUM 변화점 탐지
// ============================================================

/**
 * CUSUM (Cumulative Sum Control Chart)
 * 시계열에서 평균이 변하는 변화점(Change Point)을 탐지
 *
 * S_t^+ = max(0, S_{t-1}^+ + (x_t - μ - k))  -- 상승 방향
 * S_t^- = max(0, S_{t-1}^- - (x_t - μ - k))  -- 하락 방향
 * 변화점: S_t^+ > h 또는 S_t^- > h
 */
export function cusumDetection(
  series: number[],
  threshold?: number, // h: 감지 임계값 (기본: 4 * std)
  drift?: number,     // k: 허용 드리프트 (기본: 0.5 * std)
): ChangePoint[] {
  if (series.length < 5) return [];

  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const std = Math.sqrt(
    series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length
  );

  const h = threshold ?? 4 * std;
  const k = drift ?? 0.5 * std;

  const changePoints: ChangePoint[] = [];
  let sPlus = 0;  // 상승 누적합
  let sMinus = 0; // 하락 누적합

  for (let i = 0; i < series.length; i++) {
    sPlus = Math.max(0, sPlus + (series[i] - mean - k));
    sMinus = Math.max(0, sMinus - (series[i] - mean) + k);

    if (sPlus > h) {
      changePoints.push({
        index: i,
        timestamp: 0, // caller가 설정
        direction: 'increase',
        magnitude: sPlus / std,
        cumulativeSum: sPlus,
      });
      sPlus = 0; // 리셋
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

// ============================================================
// 5. 계절성 분해 (Seasonal Decomposition)
// ============================================================

/**
 * 가법적 계절성 분해 (Additive Decomposition)
 * Y_t = T_t + S_t + R_t
 *
 * 1) 이동평균으로 추세(T) 추출
 * 2) 원본 - 추세 = 계절성+잔차
 * 3) 주기별 평균으로 계절성(S) 추출
 * 4) 잔차(R) = 원본 - 추세 - 계절성
 */
export function seasonalDecomposition(
  series: number[],
  period: number = 12, // 월별 데이터 → 12개월 주기
): SeasonalComponent | null {
  if (series.length < period * 2) return null; // 최소 2주기 필요

  // 1) 이동평균으로 추세 추출
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

  // 경계값 보간 (선형 외삽)
  const firstValidIdx = trend.findIndex(v => !isNaN(v));
  const lastValidIdx = trend.length - 1 - [...trend].reverse().findIndex(v => !isNaN(v));

  for (let i = 0; i < firstValidIdx; i++) {
    trend[i] = trend[firstValidIdx];
  }
  for (let i = lastValidIdx + 1; i < trend.length; i++) {
    trend[i] = trend[lastValidIdx];
  }

  // 2) 탈추세 시계열
  const detrended = series.map((v, i) => v - trend[i]);

  // 3) 주기별 평균으로 계절성 추출
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

  // 계절성 평균을 0으로 맞춤 (순수 계절 효과)
  const seasonalMean = seasonalAvg.reduce((s, v) => s + v, 0) / period;
  for (let i = 0; i < period; i++) {
    seasonalAvg[i] -= seasonalMean;
  }

  const seasonal = series.map((_, i) => seasonalAvg[i % period]);

  // 4) 잔차
  const residual = series.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual, period };
}

// ============================================================
// 6. Robust Z-Score (MAD 기반)
// ============================================================

/**
 * MAD (Median Absolute Deviation) 기반 이상치 탐지
 * 기존 Z-Score는 이상치 자체에 의해 평균/표준편차가 왜곡되는 문제가 있음
 * MAD는 중앙값 기반이므로 이상치에 강건(robust)
 *
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

// ============================================================
// 7. 통합 이상탐지 파이프라인
// ============================================================

/**
 * 부동산 시계열 데이터에 대한 종합 이상탐지
 *
 * 여러 방법론을 결합하여 false positive를 줄이고 다각적 검증:
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

    // 최소 2개 기준 이상 충족 시 이상치로 판정 (false positive 감소)
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

  // 추세 방향 및 강도 (Holt의 최종 추세 기울기)
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

// ============================================================
// 8. 분류 유틸리티
// ============================================================

function classifyAnomalyType(
  series: number[],
  index: number,
  changePoints: ChangePoint[],
): AnomalyResult['type'] {
  // 변화점 근처면 level_shift
  const isNearChangePoint = changePoints.some(cp => Math.abs(cp.index - index) <= 2);
  if (isNearChangePoint) return 'level_shift';

  // 전후 값과 비교
  const prev = index > 0 ? series[index - 1] : series[index];
  const next = index < series.length - 1 ? series[index + 1] : series[index];
  const current = series[index];

  // 전후보다 급격히 높거나 낮으면 spike/dip
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
