import { NextRequest, NextResponse } from "next/server";
import { predictFraudRisk, extractFeaturesFromRiskScore, type FraudModelInput } from "@/lib/fraud-risk-model";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { loadLiveWeights } from "@/lib/live-weights";

/**
 * POST /api/fraud-risk
 * 전세사기 위험도 예측 API
 *
 * 요청:
 * {
 *   riskScore?: RiskScore,
 *   jeonseRatio?: number,
 *   mortgageRatio?: number,
 *   latitude?: number,
 *   longitude?: number,
 *   ...기타 피처
 * }
 */
export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도를 초과했습니다." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await req.json();

    // 피처 조합
    const modelInput: FraudModelInput = {};

    // RiskScore가 있으면 자동 피처 추출
    if (body.riskScore) {
      const extracted = extractFeaturesFromRiskScore(body.riskScore);
      Object.assign(modelInput, extracted);
    }

    // 직접 입력 피처
    if (body.jeonseRatio !== undefined) modelInput.jeonseRatio = body.jeonseRatio;
    if (body.mortgageRatio !== undefined) modelInput.mortgageRatio = body.mortgageRatio;
    if (body.isMultiHomeOwner !== undefined) modelInput.isMultiHomeOwner = body.isMultiHomeOwner;
    if (body.isCorporate !== undefined) modelInput.isCorporate = body.isCorporate;
    if (body.hasTaxDelinquency !== undefined) modelInput.hasTaxDelinquency = body.hasTaxDelinquency;
    if (body.buildingAge !== undefined) modelInput.buildingAge = body.buildingAge;
    if (body.regionFraudRate !== undefined) modelInput.regionFraudRate = body.regionFraudRate;
    if (body.auctionRate !== undefined) modelInput.auctionRate = body.auctionRate;
    if (body.hasDepositInsurance !== undefined) modelInput.hasDepositInsurance = body.hasDepositInsurance;
    if (body.isBrokerRegistered !== undefined) modelInput.isBrokerRegistered = body.isBrokerRegistered;
    if (body.latitude !== undefined) modelInput.latitude = body.latitude;
    if (body.longitude !== undefined) modelInput.longitude = body.longitude;
    if (body.priceVolatility !== undefined) modelInput.priceVolatility = body.priceVolatility;
    if (body.vacancyRate !== undefined) modelInput.vacancyRate = body.vacancyRate;

    // 인근 사기 사례 조회
    let nearbyFraudCases;
    if (modelInput.latitude && modelInput.longitude) {
      try {
        // 위도/경도 범위 쿼리 (약 5km 반경)
        const latRange = 0.045; // ~5km
        const lngRange = 0.055;
        const cases = await prisma.fraudCase.findMany({
          where: {
            latitude: {
              gte: modelInput.latitude - latRange,
              lte: modelInput.latitude + latRange,
            },
            longitude: {
              gte: modelInput.longitude - lngRange,
              lte: modelInput.longitude + lngRange,
            },
          },
          select: {
            address: true,
            caseType: true,
            amount: true,
            latitude: true,
            longitude: true,
          },
          take: 20,
        });

        nearbyFraudCases = cases.map((c) => ({
          address: c.address,
          caseType: c.caseType,
          amount: c.amount ?? 0,
          latitude: c.latitude,
          longitude: c.longitude,
        }));
      } catch {
        // DB 조회 실패 시 무시
      }
    }

    // 라이브 가중치 로드 (SystemSetting → 기본값 폴백)
    const customWeights = await loadLiveWeights("fraud");

    // 전세사기 위험 예측
    const result = predictFraudRisk(modelInput, nearbyFraudCases, customWeights);

    // 감사 로그
    createAuditLog({
      req,
      action: "ANALYSIS_REQUEST",
      target: "fraud-risk",
      detail: {
        fraudScore: result.fraudScore,
        riskLevel: result.riskLevel,
        featureCount: result.metadata.featureCount,
      },
    });

    return NextResponse.json(result, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Fraud risk prediction error:", message);
    return NextResponse.json(
      { error: `전세사기 위험 예측 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
