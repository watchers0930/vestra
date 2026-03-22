import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { tuneWeights, type FeedbackRecord } from "@/lib/adaptive-weight-tuner";
import { createAuditLog } from "@/lib/audit-log";

const DEFAULT_WEIGHTS: Record<string, number> = {
  "등기부 파싱": 0.25,
  "위험도 스코어": 0.30,
  "교차 분석": 0.20,
  "시세 예측": 0.15,
  "사기 탐지": 0.10,
};

const DEFAULT_BETA: Record<string, { alpha: number; beta: number }> = {
  "등기부 파싱": { alpha: 2, beta: 2 },
  "위험도 스코어": { alpha: 2, beta: 2 },
  "교차 분석": { alpha: 2, beta: 2 },
  "시세 예측": { alpha: 2, beta: 2 },
  "사기 탐지": { alpha: 2, beta: 2 },
};

/**
 * GET /api/admin/weight-tuning
 * 현재 가중치 설정, 메트릭 히스토리, 캘리브레이션 데이터 조회
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  // 현재 활성 가중치 가져오기
  const activeConfig = await prisma.weightConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // 최근 30일 메트릭 히스토리
  const history = await prisma.weightConfig.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      createdAt: true,
      brierScore: true,
      logLoss: true,
      ece: true,
      feedbackCount: true,
    },
  });

  // 피드백 통계
  const feedbackCount = await prisma.weightFeedback.count();
  const recentFeedbacks = await prisma.weightFeedback.groupBy({
    by: ["actualOutcome"],
    _count: true,
  });

  // 캘리브레이션 데이터: 예측 확률 구간별 실제 빈도
  const allFeedbacks = await prisma.weightFeedback.findMany({
    select: { predictedRisk: true, actualOutcome: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const calibrationBuckets = Array.from({ length: 10 }, (_, i) => {
    const lower = i * 10;
    const upper = (i + 1) * 10;
    const bucket = allFeedbacks.filter(
      (f) => f.predictedRisk >= lower && f.predictedRisk < upper
    );
    const observed = bucket.length > 0
      ? bucket.filter((f) => f.actualOutcome === "fraud" || f.actualOutcome === "partial_loss").length / bucket.length
      : 0;
    return {
      predicted: `${lower}-${upper}%`,
      predictedValue: (lower + upper) / 200,
      observed: Math.round(observed * 1000) / 1000,
      count: bucket.length,
    };
  });

  return NextResponse.json({
    current: activeConfig
      ? {
          weights: activeConfig.weights,
          betaParams: activeConfig.betaParams,
          brierScore: activeConfig.brierScore,
          logLoss: activeConfig.logLoss,
          ece: activeConfig.ece,
          feedbackCount: activeConfig.feedbackCount,
          improvement: activeConfig.improvement,
          confidence: activeConfig.confidence,
          updatedAt: activeConfig.createdAt,
        }
      : {
          weights: DEFAULT_WEIGHTS,
          betaParams: DEFAULT_BETA,
          brierScore: 0,
          logLoss: 0,
          ece: 0,
          feedbackCount: 0,
          improvement: 0,
          confidence: 0,
          updatedAt: null,
        },
    history: history.reverse().map((h, i) => ({
      day: `D-${history.length - i}`,
      brierScore: h.brierScore,
      logLoss: h.logLoss,
      ece: h.ece,
    })),
    calibration: calibrationBuckets,
    totalFeedbacks: feedbackCount,
    feedbackBreakdown: recentFeedbacks.reduce(
      (acc, r) => ({ ...acc, [r.actualOutcome]: r._count }),
      {} as Record<string, number>
    ),
  });
}

/**
 * POST /api/admin/weight-tuning
 * 튜닝 실행: 피드백 기반으로 가중치 최적화
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  // 현재 가중치
  const activeConfig = await prisma.weightConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const currentWeights = (activeConfig?.weights as Record<string, number>) || DEFAULT_WEIGHTS;
  const currentBeta = (activeConfig?.betaParams as Record<string, { alpha: number; beta: number }>) || DEFAULT_BETA;

  // 피드백 데이터 로드
  const feedbacks = await prisma.weightFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (feedbacks.length < 5) {
    return NextResponse.json(
      { error: "최소 5건의 피드백 데이터가 필요합니다.", feedbackCount: feedbacks.length },
      { status: 400 }
    );
  }

  // FeedbackRecord 변환
  const feedbackRecords: FeedbackRecord[] = feedbacks.map((f) => ({
    id: f.id,
    analysisId: f.analysisId,
    timestamp: f.createdAt.toISOString(),
    predictedRisk: f.predictedRisk,
    actualOutcome: f.actualOutcome as FeedbackRecord["actualOutcome"],
    lossAmount: f.lossAmount ?? undefined,
    featureValues: f.featureValues as Record<string, number>,
    weightSnapshot: f.weightSnapshot as Record<string, number>,
  }));

  // Thompson Sampling 기반 최적화 실행
  const result = tuneWeights(currentWeights, feedbackRecords, { minFeedbackCount: 5 });

  // 새로운 Beta 파라미터 업데이트
  const updatedBeta: Record<string, { alpha: number; beta: number }> = {};
  for (const [key, params] of Object.entries(currentBeta)) {
    const feedbacksForKey = feedbackRecords.filter(
      (f) => f.featureValues[key] !== undefined
    );
    const successes = feedbacksForKey.filter((f) => {
      const predicted = f.featureValues[key] * (result.optimizedWeights[key] || 0);
      const actual = f.actualOutcome === "fraud" ? 1 : 0;
      return Math.abs(predicted / 100 - actual) < 0.3;
    }).length;
    updatedBeta[key] = {
      alpha: params.alpha + successes,
      beta: params.beta + (feedbacksForKey.length - successes),
    };
  }

  // 이전 활성 가중치 비활성화
  await prisma.weightConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // 새 가중치 저장
  const newConfig = await prisma.weightConfig.create({
    data: {
      weights: result.optimizedWeights,
      betaParams: updatedBeta,
      brierScore: result.metrics.brierScore,
      logLoss: result.metrics.logLoss,
      ece: result.metrics.ece,
      feedbackCount: feedbacks.length,
      improvement: result.improvement,
      confidence: result.confidence,
      isActive: true,
    },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:run-weight-tuning",
    target: `weight-config:${newConfig.id}`,
    detail: { improvement: result.improvement, confidence: result.confidence, feedbackCount: feedbacks.length, description: "가중치 튜닝 실행" },
  });

  return NextResponse.json({
    success: true,
    result: {
      previousWeights: result.previousWeights,
      optimizedWeights: result.optimizedWeights,
      improvement: result.improvement,
      confidence: result.confidence,
      metrics: result.metrics,
    },
    configId: newConfig.id,
  });
}
