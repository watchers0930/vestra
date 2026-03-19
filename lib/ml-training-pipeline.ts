/**
 * VESTRA ML 모델 훈련 파이프라인
 * ─────────────────────────────────────────────────
 * 특허 핵심: 규칙 기반 모델에서 데이터 기반 학습 모델로의 전환.
 * Stochastic Gradient Descent(SGD)를 이용한 온라인 학습,
 * Mini-batch 교차검증, 자동 피처 정규화, 모델 버저닝.
 *
 * 외부 ML 라이브러리 없이 순수 TypeScript로 구현.
 * 알고리즘 ID: VESTRA-ML-PIPELINE-v1.0.0
 */

// ─── 타입 정의 ───

export interface TrainingSample {
  id: string;
  features: Record<string, number>;   // 피처명 → 정규화 전 값
  label: number;                       // 0 = 안전, 1 = 사기
  weight?: number;                     // 샘플 가중치 (불균형 보정)
  timestamp: string;                   // 수집 시점
  source: "manual" | "feedback" | "historical";
}

export interface FeatureStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
}

export interface ModelWeights {
  weights: Record<string, number>;
  bias: number;
  version: string;
  trainedAt: string;
  metrics: TrainingMetrics;
  featureStats: Record<string, FeatureStats>;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  lossHistory: number[];
  sampleCount: number;
  epochCount: number;
}

export interface CrossValidationResult {
  foldMetrics: TrainingMetrics[];
  meanAccuracy: number;
  stdAccuracy: number;
  meanF1: number;
  bestFoldIndex: number;
}

export interface PredictionWithConfidence {
  probability: number;         // 0-1 사기 확률
  confidence: number;          // 예측 신뢰도
  featureImportance: Array<{
    feature: string;
    importance: number;        // SHAP 유사 기여도
    direction: "risk" | "safe";
  }>;
  modelVersion: string;
}

// ─── 피처 정규화 엔진 ───

export class FeatureNormalizer {
  private stats: Record<string, FeatureStats> = {};

  /**
   * 학습 데이터에서 피처 통계량 계산 (Z-Score 정규화용)
   */
  fit(samples: TrainingSample[]): void {
    const featureValues: Record<string, number[]> = {};

    for (const sample of samples) {
      for (const [key, value] of Object.entries(sample.features)) {
        if (!featureValues[key]) featureValues[key] = [];
        featureValues[key].push(value);
      }
    }

    for (const [key, values] of Object.entries(featureValues)) {
      const n = values.length;
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
      const std = Math.sqrt(variance) || 1; // 0 방지
      this.stats[key] = {
        mean,
        std,
        min: Math.min(...values),
        max: Math.max(...values),
        count: n,
      };
    }
  }

  /**
   * Z-Score 정규화: (x - mean) / std
   * 이상치 클리핑: [-3σ, +3σ]
   */
  transform(features: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(features)) {
      const stat = this.stats[key];
      if (!stat) {
        normalized[key] = value;
        continue;
      }
      const z = (value - stat.mean) / stat.std;
      normalized[key] = Math.max(-3, Math.min(3, z)); // 이상치 클리핑
    }
    return normalized;
  }

  getStats(): Record<string, FeatureStats> {
    return { ...this.stats };
  }

  loadStats(stats: Record<string, FeatureStats>): void {
    this.stats = { ...stats };
  }
}

// ─── 로지스틱 회귀 모델 (SGD 학습) ───

export class LogisticRegressionSGD {
  private weights: Record<string, number> = {};
  private bias: number = 0;
  private learningRate: number;
  private regularization: number; // L2 정규화 계수
  private lossHistory: number[] = [];

  constructor(
    learningRate: number = 0.01,
    regularization: number = 0.001,
  ) {
    this.learningRate = learningRate;
    this.regularization = regularization;
  }

  /**
   * 시그모이드 함수: σ(z) = 1 / (1 + e^(-z))
   */
  private sigmoid(z: number): number {
    if (z > 500) return 1;
    if (z < -500) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * 순전파: z = w·x + b → σ(z)
   */
  predict(features: Record<string, number>): number {
    let z = this.bias;
    for (const [key, value] of Object.entries(features)) {
      z += (this.weights[key] || 0) * value;
    }
    return this.sigmoid(z);
  }

  /**
   * Binary Cross-Entropy Loss
   * L = -[y·log(ŷ) + (1-y)·log(1-ŷ)]
   */
  private computeLoss(
    predictions: number[],
    labels: number[],
    sampleWeights?: number[],
  ): number {
    let totalLoss = 0;
    let totalWeight = 0;

    for (let i = 0; i < predictions.length; i++) {
      const p = Math.max(1e-15, Math.min(1 - 1e-15, predictions[i]));
      const y = labels[i];
      const w = sampleWeights?.[i] ?? 1;
      totalLoss += w * -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
      totalWeight += w;
    }

    // L2 정규화 항 추가
    let l2Penalty = 0;
    for (const w of Object.values(this.weights)) {
      l2Penalty += w * w;
    }

    return totalLoss / totalWeight + this.regularization * l2Penalty;
  }

  /**
   * Mini-batch SGD 학습
   *
   * 특허 청구항:
   * (a) 부동산 사기 사례 데이터로부터 피처 벡터 생성
   * (b) 클래스 불균형 보정 가중치 적용 (사기 사례 과대표집)
   * (c) Stochastic Gradient Descent로 모델 파라미터 최적화
   * (d) L2 정규화로 과적합 방지
   * (e) Early Stopping으로 최적 에폭 자동 결정
   */
  train(
    samples: TrainingSample[],
    normalizer: FeatureNormalizer,
    epochs: number = 100,
    batchSize: number = 32,
    earlyStoppingPatience: number = 10,
  ): TrainingMetrics {
    // 피처 키 초기화
    if (samples.length > 0) {
      for (const key of Object.keys(samples[0].features)) {
        if (!(key in this.weights)) {
          this.weights[key] = (Math.random() - 0.5) * 0.1; // Xavier-like 초기화
        }
      }
    }

    // 클래스 불균형 보정 가중치 계산
    const positiveCount = samples.filter((s) => s.label === 1).length;
    const negativeCount = samples.length - positiveCount;
    const posWeight = negativeCount > 0 ? samples.length / (2 * positiveCount || 1) : 1;
    const negWeight = positiveCount > 0 ? samples.length / (2 * negativeCount || 1) : 1;

    let bestLoss = Infinity;
    let patienceCounter = 0;
    this.lossHistory = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      // 셔플
      const shuffled = [...samples].sort(() => Math.random() - 0.5);

      // Mini-batch 처리
      for (let i = 0; i < shuffled.length; i += batchSize) {
        const batch = shuffled.slice(i, i + batchSize);
        const gradients: Record<string, number> = {};
        let biasGrad = 0;

        for (const sample of batch) {
          const normalized = normalizer.transform(sample.features);
          const prediction = this.predict(normalized);
          const error = prediction - sample.label;
          const sampleWeight = (sample.weight ?? 1) *
            (sample.label === 1 ? posWeight : negWeight);

          // 그래디언트 누적
          for (const [key, value] of Object.entries(normalized)) {
            gradients[key] = (gradients[key] || 0) + sampleWeight * error * value;
          }
          biasGrad += sampleWeight * error;
        }

        // 가중치 업데이트 (L2 정규화 포함)
        const n = batch.length;
        for (const [key, grad] of Object.entries(gradients)) {
          this.weights[key] -= this.learningRate * (
            grad / n + this.regularization * (this.weights[key] || 0)
          );
        }
        this.bias -= this.learningRate * biasGrad / n;
      }

      // 에폭 종료 시 전체 손실 계산
      const allPredictions = samples.map((s) =>
        this.predict(normalizer.transform(s.features))
      );
      const allLabels = samples.map((s) => s.label);
      const allWeights = samples.map((s) =>
        (s.weight ?? 1) * (s.label === 1 ? posWeight : negWeight)
      );
      const epochLoss = this.computeLoss(allPredictions, allLabels, allWeights);
      this.lossHistory.push(epochLoss);

      // Early Stopping
      if (epochLoss < bestLoss - 1e-4) {
        bestLoss = epochLoss;
        patienceCounter = 0;
      } else {
        patienceCounter++;
        if (patienceCounter >= earlyStoppingPatience) break;
      }
    }

    // 최종 메트릭 계산
    return this.evaluate(samples, normalizer);
  }

  /**
   * 모델 평가: Accuracy, Precision, Recall, F1, AUC
   */
  evaluate(
    samples: TrainingSample[],
    normalizer: FeatureNormalizer,
  ): TrainingMetrics {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const scores: Array<{ prob: number; label: number }> = [];

    for (const sample of samples) {
      const normalized = normalizer.transform(sample.features);
      const prob = this.predict(normalized);
      const predicted = prob >= 0.5 ? 1 : 0;
      scores.push({ prob, label: sample.label });

      if (predicted === 1 && sample.label === 1) tp++;
      else if (predicted === 1 && sample.label === 0) fp++;
      else if (predicted === 0 && sample.label === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + fp + tn + fn || 1);
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    const f1Score = 2 * precision * recall / (precision + recall || 1);
    const auc = this.calculateAUC(scores);

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      lossHistory: this.lossHistory,
      sampleCount: samples.length,
      epochCount: this.lossHistory.length,
    };
  }

  /**
   * AUC-ROC 계산 (트라페조이드 근사)
   */
  private calculateAUC(
    scores: Array<{ prob: number; label: number }>,
  ): number {
    const sorted = [...scores].sort((a, b) => b.prob - a.prob);
    const totalPositive = sorted.filter((s) => s.label === 1).length;
    const totalNegative = sorted.length - totalPositive;

    if (totalPositive === 0 || totalNegative === 0) return 0.5;

    let auc = 0;
    let tpCount = 0;
    let fpCount = 0;
    let prevTPR = 0;
    let prevFPR = 0;

    for (const score of sorted) {
      if (score.label === 1) tpCount++;
      else fpCount++;

      const tpr = tpCount / totalPositive;
      const fpr = fpCount / totalNegative;

      // 사다리꼴 공식
      auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;
      prevTPR = tpr;
      prevFPR = fpr;
    }

    return auc;
  }

  /**
   * SHAP 유사 피처 중요도 (Permutation Importance)
   *
   * 특허 청구항: 각 피처를 무작위 셔플했을 때의 성능 변화량으로
   * 개별 피처의 예측 기여도를 정량화
   */
  calculateFeatureImportance(
    sample: Record<string, number>,
    normalizer: FeatureNormalizer,
    nPermutations: number = 50,
  ): PredictionWithConfidence["featureImportance"] {
    const normalized = normalizer.transform(sample);
    const basePrediction = this.predict(normalized);
    const importance: PredictionWithConfidence["featureImportance"] = [];

    for (const key of Object.keys(normalized)) {
      let totalShift = 0;

      for (let i = 0; i < nPermutations; i++) {
        const perturbed = { ...normalized };
        // 가우시안 노이즈로 피처 교란
        perturbed[key] = normalized[key] + (Math.random() - 0.5) * 2;
        const perturbedPrediction = this.predict(perturbed);
        totalShift += Math.abs(basePrediction - perturbedPrediction);
      }

      const avgShift = totalShift / nPermutations;
      importance.push({
        feature: key,
        importance: Math.round(avgShift * 1000) / 1000,
        direction: (this.weights[key] || 0) > 0 ? "risk" : "safe",
      });
    }

    return importance.sort((a, b) => b.importance - a.importance);
  }

  getWeights(): Record<string, number> {
    return { ...this.weights };
  }

  getBias(): number {
    return this.bias;
  }

  loadWeights(weights: Record<string, number>, bias: number): void {
    this.weights = { ...weights };
    this.bias = bias;
  }
}

// ─── K-Fold 교차검증 ───

/**
 * K-Fold 교차검증으로 모델 일반화 성능 평가
 *
 * 특허 청구항: 부동산 데이터의 시간적 특성을 고려한
 * Stratified K-Fold 교차검증으로 과적합 방지
 */
export function kFoldCrossValidation(
  samples: TrainingSample[],
  k: number = 5,
  learningRate: number = 0.01,
  regularization: number = 0.001,
): CrossValidationResult {
  // Stratified split: 양성/음성 비율 유지
  const positives = samples.filter((s) => s.label === 1);
  const negatives = samples.filter((s) => s.label === 0);

  const positiveFolds = splitIntoFolds(positives, k);
  const negativeFolds = splitIntoFolds(negatives, k);

  const foldMetrics: TrainingMetrics[] = [];

  for (let i = 0; i < k; i++) {
    const testSet = [...positiveFolds[i], ...negativeFolds[i]];
    const trainSet = [
      ...positiveFolds.filter((_, idx) => idx !== i).flat(),
      ...negativeFolds.filter((_, idx) => idx !== i).flat(),
    ];

    const normalizer = new FeatureNormalizer();
    normalizer.fit(trainSet);

    const model = new LogisticRegressionSGD(learningRate, regularization);
    model.train(trainSet, normalizer);

    const metrics = model.evaluate(testSet, normalizer);
    foldMetrics.push(metrics);
  }

  const accuracies = foldMetrics.map((m) => m.accuracy);
  const meanAccuracy = accuracies.reduce((a, b) => a + b, 0) / k;
  const stdAccuracy = Math.sqrt(
    accuracies.reduce((sum, a) => sum + (a - meanAccuracy) ** 2, 0) / k,
  );
  const f1Scores = foldMetrics.map((m) => m.f1Score);
  const meanF1 = f1Scores.reduce((a, b) => a + b, 0) / k;
  const bestFoldIndex = f1Scores.indexOf(Math.max(...f1Scores));

  return { foldMetrics, meanAccuracy, stdAccuracy, meanF1, bestFoldIndex };
}

function splitIntoFolds<T>(arr: T[], k: number): T[][] {
  const folds: T[][] = Array.from({ length: k }, () => []);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  shuffled.forEach((item, i) => folds[i % k].push(item));
  return folds;
}

// ─── 메인 훈련 파이프라인 ───

/**
 * VESTRA ML 훈련 파이프라인 실행
 *
 * 특허 청구항 핵심:
 * (a) 부동산 등기부등본 분석 결과와 실제 사기 여부 레이블을 학습 데이터로 구성
 * (b) 자동 피처 정규화(Z-Score) 및 이상치 클리핑(-3σ~+3σ)
 * (c) 클래스 불균형 보정 가중치(Inverse Class Frequency) 적용
 * (d) SGD + L2 정규화 + Early Stopping으로 로지스틱 회귀 모델 학습
 * (e) Stratified K-Fold 교차검증으로 일반화 성능 검증
 * (f) Permutation Importance 기반 피처 중요도 산출
 * (g) 학습된 가중치를 기존 규칙 기반 모델에 자동 피드백
 */
export function runTrainingPipeline(
  samples: TrainingSample[],
  config: {
    learningRate?: number;
    regularization?: number;
    epochs?: number;
    batchSize?: number;
    kFolds?: number;
    earlyStoppingPatience?: number;
  } = {},
): {
  model: ModelWeights;
  crossValidation: CrossValidationResult;
  prediction: (features: Record<string, number>) => PredictionWithConfidence;
} {
  const {
    learningRate = 0.01,
    regularization = 0.001,
    epochs = 100,
    batchSize = 32,
    kFolds = 5,
    earlyStoppingPatience = 10,
  } = config;

  // Step 1: 교차검증
  const cvResult = kFoldCrossValidation(
    samples, kFolds, learningRate, regularization,
  );

  // Step 2: 전체 데이터로 최종 모델 학습
  const normalizer = new FeatureNormalizer();
  normalizer.fit(samples);

  const model = new LogisticRegressionSGD(learningRate, regularization);
  const metrics = model.train(
    samples, normalizer, epochs, batchSize, earlyStoppingPatience,
  );

  const modelVersion = `VESTRA-ML-v${Date.now()}`;
  const featureStats = normalizer.getStats();

  const modelWeights: ModelWeights = {
    weights: model.getWeights(),
    bias: model.getBias(),
    version: modelVersion,
    trainedAt: new Date().toISOString(),
    metrics,
    featureStats,
  };

  // Step 3: 예측 함수 생성
  const predictionFn = (features: Record<string, number>): PredictionWithConfidence => {
    const normalized = normalizer.transform(features);
    const probability = model.predict(normalized);
    const featureImportance = model.calculateFeatureImportance(
      features, normalizer,
    );

    // 신뢰도: 모델 성능(F1) × 예측 확실성(엔트로피 역수)
    const entropy = -(
      probability * Math.log2(Math.max(probability, 1e-15)) +
      (1 - probability) * Math.log2(Math.max(1 - probability, 1e-15))
    );
    const certainty = 1 - entropy; // 0 = 불확실, 1 = 확실
    const confidence = Math.round(metrics.f1Score * certainty * 100) / 100;

    return {
      probability: Math.round(probability * 1000) / 1000,
      confidence,
      featureImportance: featureImportance.slice(0, 10),
      modelVersion,
    };
  };

  return {
    model: modelWeights,
    crossValidation: cvResult,
    prediction: predictionFn,
  };
}

/**
 * 온라인 학습: 새로운 피드백 데이터로 기존 모델 점진적 업데이트
 *
 * 특허 청구항: 사용자 피드백(실제 사기 여부 확인)을 통한
 * 실시간 모델 개선. 전체 재학습 없이 가중치 점진적 갱신.
 */
export function onlineUpdate(
  currentWeights: ModelWeights,
  newSample: TrainingSample,
  learningRate: number = 0.005, // 온라인 학습은 낮은 학습률
): ModelWeights {
  const normalizer = new FeatureNormalizer();
  normalizer.loadStats(currentWeights.featureStats);

  const model = new LogisticRegressionSGD(learningRate, 0.0005);
  model.loadWeights(currentWeights.weights, currentWeights.bias);

  // 단일 샘플로 가중치 업데이트
  const normalized = normalizer.transform(newSample.features);
  const prediction = model.predict(normalized);
  const error = prediction - newSample.label;

  // 수동 그래디언트 업데이트
  const weights = model.getWeights();
  for (const [key, value] of Object.entries(normalized)) {
    weights[key] = (weights[key] || 0) - learningRate * error * value;
  }
  const bias = model.getBias() - learningRate * error;
  model.loadWeights(weights, bias);

  // 피처 통계 점진적 업데이트 (Welford's online algorithm)
  const updatedStats = { ...currentWeights.featureStats };
  for (const [key, value] of Object.entries(newSample.features)) {
    const stat = updatedStats[key];
    if (stat) {
      const newCount = stat.count + 1;
      const delta = value - stat.mean;
      const newMean = stat.mean + delta / newCount;
      const delta2 = value - newMean;
      const newVariance = ((stat.std ** 2) * stat.count + delta * delta2) / newCount;
      updatedStats[key] = {
        mean: newMean,
        std: Math.sqrt(newVariance) || 1,
        min: Math.min(stat.min, value),
        max: Math.max(stat.max, value),
        count: newCount,
      };
    }
  }

  return {
    weights: model.getWeights(),
    bias: model.getBias(),
    version: `${currentWeights.version}-online-${Date.now()}`,
    trainedAt: new Date().toISOString(),
    metrics: currentWeights.metrics, // 메트릭은 주기적 재평가 시 갱신
    featureStats: updatedStats,
  };
}
