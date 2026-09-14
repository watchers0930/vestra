/**
 * 기존 등기감시 물건을 "내 자산"으로 편입.
 * POST /api/monitoring/{id}/to-asset
 *
 * 서버에 저장된 등기 원문(baselineData, PII 자동복호화)이 있으면 그 원문으로
 * 완전 권리분석을 실행해 결과(가치·안전도·위험도)만 반환한다(등기 원문은 클라에 노출하지 않음).
 * 원문이 없으면 analyzed=false로 반환 → 클라가 주소 기반 시세만 반영하도록 폴백.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { runAnalysisPipeline } from "@/app/api/analyze-unified/analyze-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id } = await params;
    const uid = session.user.id;
    const ip = req.headers.get("x-forwarded-for") || "anonymous";

    // 남용 차단: 분당 rate limit (진입 방어)
    const rl = await rateLimit(`to-asset:${uid}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 소유자 또는 연결된 중개사/고객만 (상세조회와 동일 권한)
    const prop = await prisma.monitoredProperty.findFirst({
      where: {
        id,
        OR: [
          { userId: uid },
          {
            agentClientProperties: {
              some: {
                status: "active",
                agentClient: { OR: [{ agentId: uid }, { clientUserId: uid }] },
              },
            },
          },
        ],
      },
    });

    if (!prop) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    // 등기 원문 보유 → 서버에서 완전 분석 후 결과만 반환
    const registryText = prop.baselineData;
    if (registryText && registryText.trim().length >= 20) {
      // 무거운 AI 분석을 실제로 실행하는 경우에만 일일 한도를 소모한다.
      const dailyLimit = session.user.dailyLimit || ROLE_LIMITS.GUEST;
      const daily = await checkDailyUsage(uid, dailyLimit, "analyze-rights");
      if (!daily.success) {
        return NextResponse.json(
          { error: "일일 사용 한도를 초과했습니다." },
          { status: 429, headers: rateLimitHeaders(daily) }
        );
      }

      const result = await runAnalysisPipeline({
        rawText: registryText,
        address: prop.address,
        inputSource: "tilko",
        ip,
      });
      return NextResponse.json({
        analyzed: true,
        asset: {
          // 자산 매칭·중복 방지를 위해 감시 기준 주소(prop.address)로 통일
          // (등기 파싱 displayAddress와 표기가 달라 오판정/중복되는 것을 방지)
          address: prop.address,
          type: result.propertyInfo?.type || "부동산",
          estimatedPrice: result.propertyInfo?.estimatedPrice || 0,
          jeonsePrice: result.propertyInfo?.jeonsePrice || 0,
          safetyScore: result.riskAnalysis?.safetyScore || 0,
          riskScore: result.riskAnalysis?.riskScore || 0,
        },
      });
    }

    // 등기 원문 없음 → 클라가 주소 기반 시세만 반영하도록 폴백
    return NextResponse.json({ analyzed: false, address: prop.address });
  } catch (error) {
    console.error("[monitoring/to-asset]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
