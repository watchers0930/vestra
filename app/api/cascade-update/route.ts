import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createCascadeEngine } from "@/lib/cascade-engine";
import { registerAllRecalculators, type CascadeContext } from "@/lib/cascade-recalculators";

/**
 * POST /api/cascade-update
 * 캐스케이드 업데이트 실행 API
 *
 * 동일 주소에 대한 여러 분석 결과가 있을 때,
 * 가장 최근 분석을 트리거로 연관 분석들을 자동 재계산.
 *
 * Body: { address: string }
 */
export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도를 초과했습니다." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // 인증 확인
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { address } = await req.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "address는 필수 문자열입니다." },
        { status: 400 },
      );
    }

    // 해당 사용자 + 주소의 모든 분석 레코드 조회
    const analyses = await prisma.analysis.findMany({
      where: {
        userId: session.user.id,
        address,
      },
      orderBy: { createdAt: "desc" },
    });

    if (analyses.length < 2) {
      return NextResponse.json(
        { error: "캐스케이드 업데이트에는 동일 주소의 분석이 2건 이상 필요합니다." },
        { status: 400 },
      );
    }

    // 분석 데이터에서 컨텍스트 구성
    const ctx: CascadeContext = {};

    for (const analysis of analyses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = typeof analysis.data === "string"
          ? JSON.parse(analysis.data)
          : analysis.data ?? {};
      } catch {
        console.warn(`분석 데이터 파싱 실패 (id: ${analysis.id}), 건너뜀`);
        continue;
      }

      switch (analysis.type) {
        case "rights":
        case "registry":
          if (data?.riskScore) ctx.registry = data.riskScore;
          if (data?.parsed) ctx.parsed = data.parsed;
          if (data?.estimatedPrice) ctx.estimatedPrice = data.estimatedPrice;
          break;
        case "contract":
          if (data) ctx.contract = data;
          break;
        case "prediction":
          if (data) ctx.price = data;
          break;
        case "jeonse":
          if (data?.jeonseRatio) ctx.jeonseRatio = data.jeonseRatio;
          if (data?.jeonsePrice) ctx.jeonsePrice = data.jeonsePrice;
          ctx.jeonse = data;
          break;
      }

      // fraudRisk / vScore는 Analysis 모델의 별도 컬럼
      if (analysis.fraudRisk) {
        ctx.fraud = analysis.fraudRisk as unknown as CascadeContext["fraud"];
      }
      if (analysis.vScore) {
        const vScoreData = analysis.vScore as Record<string, unknown>;
        if (typeof vScoreData.score === "number") {
          ctx.vscore = vScoreData.score;
        }
      }
    }

    // 캐스케이드 엔진 생성 + 재계산기 등록
    const engine = createCascadeEngine();
    registerAllRecalculators(engine, ctx);

    // 컨텍스트를 엔진에 설정
    engine.setFullContext(ctx as Record<string, unknown>);

    // 가장 최근 분석의 타입을 트리거 노드로 결정
    const latestAnalysis = analyses[0];
    const triggerNodeMap: Record<string, string> = {
      rights: "registry",
      registry: "registry",
      contract: "contract",
      prediction: "price",
      jeonse: "jeonse",
      feasibility: "price",
    };
    const triggerNode = triggerNodeMap[latestAnalysis.type] ?? "registry";
    const triggerValue = ctx[triggerNode as keyof CascadeContext];

    // 캐스케이드 실행
    const result = await engine.executeCascade(triggerNode, triggerValue);

    return NextResponse.json({
      success: true,
      triggerNode,
      triggerAddress: address,
      analysisCount: analyses.length,
      cascade: {
        totalNodesAffected: result.totalNodesAffected,
        totalUpdatesSkipped: result.totalUpdatesSkipped,
        executionOrder: result.executionOrder,
        executionTimeMs: result.executionTimeMs,
        updates: result.updatesExecuted.map((u) => ({
          nodeId: u.nodeId,
          nodeName: u.nodeName,
          skipped: u.skipped,
          skipReason: u.skipReason,
        })),
      },
    }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    return handleApiError(error, "연쇄 업데이트");
  }
}
