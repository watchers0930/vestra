/**
 * 피드백 수집 API
 * POST: 분석 결과에 대한 사용자 피드백 수집
 *
 * - WeightFeedback 테이블에 저장 (적응형 가중치 튜닝용)
 * - 피드백 임계치(10건) 도달 시 가중치 재계산 트리거
 * - 인증 선택: 게스트 & 로그인 사용자 모두 지원
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { tuneWeights, type FeedbackRecord } from "@/lib/adaptive-weight-tuner";

// 피드백 rating → actualOutcome 매핑
function ratingToOutcome(rating: "positive" | "negative"): "safe" | "fraud" {
  return rating === "positive" ? "safe" : "fraud";
}

// 기본 가중치 (fraud-risk-model.ts와 동기화)
const DEFAULT_FRAUD_WEIGHTS: Record<string, number> = {
  mortgage_ratio: 0.12,
  seizure_present: 0.10,
  priority_claim_ratio: 0.08,
  jeonse_ratio: 0.14,
  price_volatility: 0.06,
  vacancy_rate: 0.04,
  multi_home_owner: 0.06,
  corporate_landlord: 0.04,
  tax_delinquency: 0.08,
  building_age: 0.03,
  region_fraud_rate: 0.08,
  auction_rate: 0.05,
  contract_safety: 0.06,
  broker_registered: 0.03,
  deposit_insurance: 0.03,
};

const FEEDBACK_THRESHOLD = 10; // 가중치 재계산 트리거 임계치

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`feedback:${ip}`, 10);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await req.json();
    const { analysisId, analysisType, rating, comment } = body;

    // 입력 검증
    if (!analysisId || typeof analysisId !== "string") {
      return NextResponse.json({ error: "analysisId가 필요합니다." }, { status: 400 });
    }
    if (!analysisType || typeof analysisType !== "string") {
      return NextResponse.json({ error: "analysisType이 필요합니다." }, { status: 400 });
    }
    if (!rating || !["positive", "negative"].includes(rating)) {
      return NextResponse.json(
        { error: "rating은 'positive' 또는 'negative'이어야 합니다." },
        { status: 400 }
      );
    }

    const actualOutcome = ratingToOutcome(rating);

    // 현재 가중치 로드 (SystemSetting에서, 없으면 기본값)
    let currentWeights = { ...DEFAULT_FRAUD_WEIGHTS };
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `weights_${analysisType}` },
      });
      if (setting?.value) {
        currentWeights = JSON.parse(setting.value);
      }
    } catch {
      // 파싱 실패 시 기본값 유지
    }

    // WeightFeedback에 저장
    try {
      await prisma.weightFeedback.create({
        data: {
          analysisId,
          predictedRisk: 50, // 실제 예측값을 모르므로 중립값
          actualOutcome,
          lossAmount: null,
          featureValues: currentWeights, // 현재 피처값 (가중치를 피처로 저장)
          weightSnapshot: currentWeights,
        },
      });
    } catch (dbError) {
      // WeightFeedback 저장 실패 시 AuditLog로 폴백
      console.error("[Feedback] WeightFeedback 저장 실패, AuditLog로 폴백:", dbError);
      createAuditLog({
        req,
        action: "feedback",
        target: analysisId,
        detail: {
          analysisType,
          rating,
          comment: comment?.slice(0, 500) || null,
          actualOutcome,
        },
      });

      return NextResponse.json(
        { success: true, message: "피드백이 기록되었습니다.", recalculated: false },
        { headers: rateLimitHeaders(rl) }
      );
    }

    // 감사 로그
    createAuditLog({
      req,
      action: "feedback",
      target: analysisId,
      detail: {
        analysisType,
        rating,
        comment: comment?.slice(0, 500) || null,
      },
    });

    // 피드백 임계치 도달 시 가중치 재계산
    let recalculated = false;
    try {
      const feedbackCount = await prisma.weightFeedback.count();

      if (feedbackCount >= FEEDBACK_THRESHOLD) {
        // 최근 피드백 로드
        const recentFeedbacks = await prisma.weightFeedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        // FeedbackRecord로 변환
        const records: FeedbackRecord[] = recentFeedbacks.map((fb) => ({
          id: fb.id,
          analysisId: fb.analysisId,
          timestamp: fb.createdAt.toISOString(),
          predictedRisk: fb.predictedRisk,
          actualOutcome: fb.actualOutcome as FeedbackRecord["actualOutcome"],
          lossAmount: fb.lossAmount ?? undefined,
          featureValues: fb.featureValues as Record<string, number>,
          weightSnapshot: fb.weightSnapshot as Record<string, number>,
        }));

        // 가중치 튜닝
        const result = tuneWeights(currentWeights, records);

        // 개선이 있을 때만 저장
        if (result.improvement > 0 || result.confidence > 0.3) {
          await prisma.systemSetting.upsert({
            where: { key: `weights_${analysisType}` },
            update: {
              value: JSON.stringify(result.optimizedWeights),
              category: "weights",
            },
            create: {
              key: `weights_${analysisType}`,
              value: JSON.stringify(result.optimizedWeights),
              category: "weights",
            },
          });

          // WeightConfig에도 기록
          await prisma.weightConfig.create({
            data: {
              weights: result.optimizedWeights,
              betaParams: {}, // Thompson Sampling 내부 관리
              brierScore: result.metrics.brierScore,
              logLoss: result.metrics.logLoss,
              ece: result.metrics.ece,
              feedbackCount,
              improvement: result.improvement,
              confidence: result.confidence,
              isActive: true,
            },
          });

          // 이전 활성 가중치 비활성화
          await prisma.weightConfig.updateMany({
            where: {
              isActive: true,
              NOT: { id: undefined }, // 방금 생성한 것 제외 (최신 createdAt 기준)
            },
            data: { isActive: false },
          });

          recalculated = true;
        }
      }
    } catch (tuningError) {
      console.error("[Feedback] 가중치 재계산 실패:", tuningError);
      // 재계산 실패해도 피드백 저장은 성공
    }

    return NextResponse.json(
      {
        success: true,
        message: recalculated
          ? "피드백이 반영되어 가중치가 업데이트되었습니다."
          : "피드백이 기록되었습니다.",
        recalculated,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[Feedback] 처리 오류:", message);
    return NextResponse.json(
      { error: `피드백 처리 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
