/**
 * VESTRA 적응형 가중치 자동 튜닝 시스템
 * ──────────────────────────────────────────────
 * 특허 핵심: 사용자 피드백과 실제 사기 발생 데이터를 기반으로
 * V-Score 및 Fraud Risk Model의 가중치를 자동으로 최적화.
 * Bayesian Optimization 근사 + Thompson Sampling.
 *
 * 순수 TypeScript 구현. 알고리즘 ID: VESTRA-ADAPTIVE-v1.0.0
 */

// ─── 타입 정의 ───

export interface FeedbackRecord {
  id: string;
  analysisId: string;
  timestamp: string;
  predictedRisk: number;       // 시스템이 예측한 위험도 (0-100)
  actualOutcome: "safe" | "fraud" | "partial_loss" | "unknown";
  lossAmount?: number;         // 실제 피해 금액
  featureValues: Record<string, number>; // 당시 피처값
  weightSnapshot: Record<string, number>; // 당시 적용된 가중치
}

export interface WeightCandidate {
  weights: Record<string, number>;
  score: number;              // 성능 점수 (높을수록 좋음)
  trialCount: number;
  successCount: number;       // 올바른 예측 횟수
}

export interface TuningResult {
  previousWeights: Record<string, number>;
  optimizedWeights: Record<string, number>;
  improvement: number;         // 성능 향상 비율 (%)
  confidence: number;          // 최적화 신뢰도
  calibrationError: number;    // 보정 오차 (낮을수록 좋음)
  metrics: {
    brierScore: number;        // 확률 예측 정확도
    logLoss: number;           // 로그 손실
    ece: number;               // Expected Calibration Error
  };
  history: TuningIteration[];
}

export interface TuningIteration {
  iteration: number;
  weights: Record<string, number>;
  score: number;
  brierScore: number;
}

// ─── Beta 분포 기반 Thompson Sampling ───

interface BetaParams {
  alpha: number;  // 성공 횟수 + 1
  beta: number;   // 실패 횟수 + 1
}

/**
 * Beta 분포에서 샘플링 (Thompson Sampling)
 * Box-Muller 변환 기반 근사
 */
function sampleBeta(params: BetaParams): number {
  const { alpha, beta } = params;

  // Gamma 분포 샘플링으로 Beta 분포 생성
  const gammaA = sampleGamma(alpha);
  const gammaB = sampleGamma(beta);

  return gammaA / (gammaA + gammaB);
}

function sampleGamma(shape: number): number {
  // Marsaglia and Tsang's method
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Brier Score (확률 예측 정확도) ───

/**
 * Brier Score: BS = (1/N) × Σ(p_i - o_i)²
 * p_i: 예측 확률, o_i: 실제 결과 (0 or 1)
 * 낮을수록 좋음 (0 = 완벽)
 */
function calculateBrierScore(
  predictions: number[],
  outcomes: number[],
): number {
  if (predictions.length === 0) return 1;
  let sum = 0;
  for (let i = 0; i < predictions.length; i++) {
    sum += (predictions[i] - outcomes[i]) ** 2;
  }
  return sum / predictions.length;
}

/**
 * Expected Calibration Error (ECE)
 * 예측 확률과 실제 빈도의 편차 측정
 */
function calculateECE(
  predictions: number[],
  outcomes: number[],
  nBins: number = 10,
): number {
  const bins: Array<{ count: number; predSum: number; outcomeSum: number }> =
    Array.from({ length: nBins }, () => ({ count: 0, predSum: 0, outcomeSum: 0 }));

  for (let i = 0; i < predictions.length; i++) {
    const binIdx = Math.min(Math.floor(predictions[i] * nBins), nBins - 1);
    bins[binIdx].count++;
    bins[binIdx].predSum += predictions[i];
    bins[binIdx].outcomeSum += outcomes[i];
  }

  let ece = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const avgPred = bin.predSum / bin.count;
    const avgOutcome = bin.outcomeSum / bin.count;
    ece += (bin.count / predictions.length) * Math.abs(avgPred - avgOutcome);
  }

  return ece;
}

/**
 * Log Loss (Binary Cross-Entropy)
 */
function calculateLogLoss(
  predictions: number[],
  outcomes: number[],
): number {
  if (predictions.length === 0) return 1;
  let sum = 0;
  for (let i = 0; i < predictions.length; i++) {
    const p = Math.max(1e-15, Math.min(1 - 1e-15, predictions[i]));
    sum += -(outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p));
  }
  return sum / predictions.length;
}

// ─── 가중치 성능 평가 함수 ───

/**
 * 가중치 세트의 예측 성능 평가
 */
function evaluateWeights(
  weights: Record<string, number>,
  feedbacks: FeedbackRecord[],
): number {
  const predictions: number[] = [];
  const outcomes: number[] = [];

  for (const fb of feedbacks) {
    // 가중합으로 예측 위험도 재계산
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [key, value] of Object.entries(fb.featureValues)) {
      const w = weights[key] ?? 0;
      weightedSum += value * w;
      totalWeight += Math.abs(w);
    }

    const predicted = totalWeight > 0 ? weightedSum / totalWeight / 100 : 0.5;
    predictions.push(Math.max(0, Math.min(1, predicted)));

    const actual = fb.actualOutcome === "fraud" ? 1 :
                   fb.actualOutcome === "partial_loss" ? 0.5 : 0;
    outcomes.push(actual);
  }

  // 성능 = 1 - Brier Score (높을수록 좋음)
  const brierScore = calculateBrierScore(predictions, outcomes);
  return 1 - brierScore;
}

// ─── 메인 튜닝 알고리즘 ───

/**
 * 적응형 가중치 자동 튜닝
 *
 * 특허 청구항 핵심:
 * (a) 사용자 피드백 레코드(예측 위험도 vs 실제 결과)를 수집
 * (b) Thompson Sampling으로 유망한 가중치 후보 탐색
 * (c) 각 후보를 과거 피드백 데이터로 평가 (Brier Score)
 * (d) 최고 성능 가중치를 선택하되, 현재 가중치와의 변동폭 제한
 * (e) ECE(Expected Calibration Error)로 확률 보정 품질 검증
 * (f) 점진적 업데이트로 급격한 변동 방지 (Exponential Moving Average)
 */
export function tuneWeights(
  currentWeights: Record<string, number>,
  feedbacks: FeedbackRecord[],
  config: {
    nCandidates?: number;       // 탐색할 후보 수
    maxPerturbation?: number;   // 최대 가중치 변동폭 (%)
    smoothingFactor?: number;   // EMA 평활 계수 (0-1)
    minFeedbackCount?: number;  // 최소 피드백 수
  } = {},
): TuningResult {
  const {
    nCandidates = 50,
    maxPerturbation = 20,
    smoothingFactor = 0.3,
    minFeedbackCount = 10,
  } = config;

  const history: TuningIteration[] = [];

  // 피드백 부족 시 현재 가중치 유지
  if (feedbacks.length < minFeedbackCount) {
    return {
      previousWeights: { ...currentWeights },
      optimizedWeights: { ...currentWeights },
      improvement: 0,
      confidence: 0,
      calibrationError: 1,
      metrics: { brierScore: 1, logLoss: 1, ece: 1 },
      history,
    };
  }

  // 현재 가중치 성능 기준선
  const baselineScore = evaluateWeights(currentWeights, feedbacks);

  // Beta 분포 파라미터 (각 가중치 키별)
  const betaParams: Record<string, BetaParams> = {};
  for (const key of Object.keys(currentWeights)) {
    betaParams[key] = { alpha: 2, beta: 2 }; // 약한 사전분포
  }

  // 피드백에서 Beta 파라미터 업데이트
  for (const fb of feedbacks) {
    const wasCorrect = (
      (fb.predictedRisk > 50 && fb.actualOutcome === "fraud") ||
      (fb.predictedRisk <= 50 && fb.actualOutcome === "safe")
    );

    for (const key of Object.keys(fb.weightSnapshot)) {
      if (!betaParams[key]) betaParams[key] = { alpha: 2, beta: 2 };
      if (wasCorrect) betaParams[key].alpha++;
      else betaParams[key].beta++;
    }
  }

  // Thompson Sampling으로 후보 생성 및 평가
  let bestCandidate: WeightCandidate = {
    weights: { ...currentWeights },
    score: baselineScore,
    trialCount: 0,
    successCount: 0,
  };

  for (let i = 0; i < nCandidates; i++) {
    const candidateWeights: Record<string, number> = {};

    for (const [key, value] of Object.entries(currentWeights)) {
      const params = betaParams[key] || { alpha: 2, beta: 2 };
      const sampledQuality = sampleBeta(params);

      // 품질이 높으면 가중치 유지, 낮으면 조정
      const perturbation = (sampledQuality - 0.5) * 2 * (maxPerturbation / 100);
      candidateWeights[key] = value * (1 + perturbation);

      // 가중치 범위 제한 (0.01 ~ 1.0)
      candidateWeights[key] = Math.max(0.01, Math.min(1.0, candidateWeights[key]));
    }

    // 가중치 정규화 (합 = 1)
    const totalWeight = Object.values(candidateWeights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(candidateWeights)) {
      candidateWeights[key] /= totalWeight;
    }

    const score = evaluateWeights(candidateWeights, feedbacks);

    history.push({
      iteration: i,
      weights: { ...candidateWeights },
      score,
      brierScore: 1 - score,
    });

    if (score > bestCandidate.score) {
      bestCandidate = {
        weights: candidateWeights,
        score,
        trialCount: i + 1,
        successCount: 0,
      };
    }
  }

  // EMA 평활화: 급격한 변동 방지
  const smoothedWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(currentWeights)) {
    const optimized = bestCandidate.weights[key] ?? value;
    smoothedWeights[key] = smoothingFactor * optimized + (1 - smoothingFactor) * value;
  }

  // 정규화
  const totalSmoothed = Object.values(smoothedWeights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(smoothedWeights)) {
    smoothedWeights[key] /= totalSmoothed;
  }

  // 최종 메트릭 계산
  const predictions: number[] = [];
  const outcomes: number[] = [];

  for (const fb of feedbacks) {
    let weightedSum = 0;
    let totalW = 0;
    for (const [key, value] of Object.entries(fb.featureValues)) {
      const w = smoothedWeights[key] ?? 0;
      weightedSum += value * w;
      totalW += Math.abs(w);
    }
    predictions.push(Math.max(0, Math.min(1, totalW > 0 ? weightedSum / totalW / 100 : 0.5)));
    outcomes.push(fb.actualOutcome === "fraud" ? 1 : fb.actualOutcome === "partial_loss" ? 0.5 : 0);
  }

  const brierScore = calculateBrierScore(predictions, outcomes);
  const logLoss = calculateLogLoss(predictions, outcomes);
  const ece = calculateECE(predictions, outcomes);
  const finalScore = evaluateWeights(smoothedWeights, feedbacks);
  const improvement = baselineScore > 0
    ? ((finalScore - baselineScore) / baselineScore) * 100
    : 0;

  // 신뢰도: 데이터 양 × 성능 향상 여부
  const dataConfidence = Math.min(1, feedbacks.length / 100);
  const improvementConfidence = improvement > 0 ? 0.8 : 0.3;
  const confidence = Math.round(dataConfidence * improvementConfidence * 100) / 100;

  return {
    previousWeights: { ...currentWeights },
    optimizedWeights: smoothedWeights,
    improvement: Math.round(improvement * 100) / 100,
    confidence,
    calibrationError: Math.round(ece * 1000) / 1000,
    metrics: {
      brierScore: Math.round(brierScore * 1000) / 1000,
      logLoss: Math.round(logLoss * 1000) / 1000,
      ece: Math.round(ece * 1000) / 1000,
    },
    history,
  };
}

/**
 * Isotonic Regression 기반 확률 보정
 *
 * 특허 청구항: 모델의 출력 확률을 실제 빈도에 맞게
 * 단조 증가 함수로 보정하여 확률 신뢰도 향상
 */
export function calibrateProbabilities(
  predictions: number[],
  outcomes: number[],
): (rawProbability: number) => number {
  // 예측값 기준 정렬
  const pairs = predictions.map((p, i) => ({ pred: p, outcome: outcomes[i] }))
    .sort((a, b) => a.pred - b.pred);

  // Pool Adjacent Violators Algorithm (PAVA)
  const n = pairs.length;
  const calibrated = pairs.map((p) => p.outcome);
  const weights = new Array(n).fill(1);

  let i = 0;
  while (i < n - 1) {
    if (calibrated[i] > calibrated[i + 1]) {
      // 단조성 위반: 인접 블록 병합
      const merged = (calibrated[i] * weights[i] + calibrated[i + 1] * weights[i + 1]) /
        (weights[i] + weights[i + 1]);
      calibrated[i] = merged;
      calibrated[i + 1] = merged;
      weights[i] += weights[i + 1];
      weights[i + 1] = weights[i];

      // 이전 블록과도 확인
      while (i > 0 && calibrated[i - 1] > calibrated[i]) {
        const prev = (calibrated[i - 1] * weights[i - 1] + calibrated[i] * weights[i]) /
          (weights[i - 1] + weights[i]);
        calibrated[i - 1] = prev;
        calibrated[i] = prev;
        weights[i - 1] += weights[i];
        weights[i] = weights[i - 1];
        i--;
      }
    }
    i++;
  }

  // 보간 함수 생성
  const calibrationMap = pairs.map((p, idx) => ({
    rawPred: p.pred,
    calibratedProb: calibrated[idx],
  }));

  return (rawProbability: number): number => {
    if (calibrationMap.length === 0) return rawProbability;

    // 선형 보간
    const lower = calibrationMap.filter((c) => c.rawPred <= rawProbability).pop();
    const upper = calibrationMap.find((c) => c.rawPred > rawProbability);

    if (!lower) return calibrationMap[0].calibratedProb;
    if (!upper) return calibrationMap[calibrationMap.length - 1].calibratedProb;

    const t = (rawProbability - lower.rawPred) / (upper.rawPred - lower.rawPred || 1);
    return lower.calibratedProb + t * (upper.calibratedProb - lower.calibratedProb);
  };
}
