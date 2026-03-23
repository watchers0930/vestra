import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";

/**
 * POST /api/user/sync-data
 * localStorage 데이터를 서버 DB에 동기화 (upsert)
 *
 * Body: { type: "analysis" | "asset", data: AnalysisRecord | StoredAsset }
 */
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const userId = session.user.id;
  const { type, data } = await req.json();

  if (!type || !data) {
    return NextResponse.json({ error: "type과 data는 필수입니다." }, { status: 400 });
  }

  try {
    if (type === "analysis") {
      const { id, type: analysisType, typeLabel, address, summary, date, data: analysisData } = data;

      if (!id || !analysisType || !typeLabel || !address || !summary) {
        return NextResponse.json({ error: "분석 데이터가 불완전합니다." }, { status: 400 });
      }

      await prisma.analysis.upsert({
        where: { id },
        update: {
          type: analysisType,
          typeLabel,
          address,
          summary,
          data: JSON.stringify(analysisData ?? {}),
        },
        create: {
          id,
          userId,
          type: analysisType,
          typeLabel,
          address,
          summary,
          data: JSON.stringify(analysisData ?? {}),
          createdAt: date ? new Date(date) : new Date(),
        },
      });

      return NextResponse.json({ ok: true, synced: "analysis", id });
    }

    if (type === "asset") {
      const { id, address, type: assetType, estimatedPrice, jeonsePrice, safetyScore, riskScore, lastAnalyzedDate, priceHistory } = data;

      if (!id || !address || !assetType) {
        return NextResponse.json({ error: "자산 데이터가 불완전합니다." }, { status: 400 });
      }

      await prisma.asset.upsert({
        where: { userId_address: { userId, address } },
        update: {
          type: assetType,
          estimatedPrice: estimatedPrice ?? 0,
          jeonsePrice: jeonsePrice ?? null,
          safetyScore: safetyScore ?? 0,
          riskScore: riskScore ?? 0,
          lastAnalyzedDate: lastAnalyzedDate ? new Date(lastAnalyzedDate) : new Date(),
          priceHistory: priceHistory ? JSON.stringify(priceHistory) : null,
        },
        create: {
          id,
          userId,
          address,
          type: assetType,
          estimatedPrice: estimatedPrice ?? 0,
          jeonsePrice: jeonsePrice ?? null,
          safetyScore: safetyScore ?? 0,
          riskScore: riskScore ?? 0,
          lastAnalyzedDate: lastAnalyzedDate ? new Date(lastAnalyzedDate) : new Date(),
          priceHistory: priceHistory ? JSON.stringify(priceHistory) : null,
        },
      });

      return NextResponse.json({ ok: true, synced: "asset", id });
    }

    return NextResponse.json({ error: "type은 'analysis' 또는 'asset'이어야 합니다." }, { status: 400 });
  } catch (error) {
    console.error("sync-data 오류:", error);
    return NextResponse.json({ error: "동기화 실패" }, { status: 500 });
  }
}

/**
 * GET /api/user/sync-data
 * 서버 DB에 저장된 사용자의 분석/자산 데이터 조회
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [analyses, assets] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          typeLabel: true,
          address: true,
          summary: true,
          data: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.asset.findMany({
        where: { userId },
        select: {
          id: true,
          address: true,
          type: true,
          estimatedPrice: true,
          jeonsePrice: true,
          safetyScore: true,
          riskScore: true,
          lastAnalyzedDate: true,
          priceHistory: true,
        },
        orderBy: { lastAnalyzedDate: "desc" },
      }),
    ]);

    // 클라이언트 store 형식에 맞게 변환
    const formattedAnalyses = analyses.map((a) => ({
      id: a.id,
      type: a.type,
      typeLabel: a.typeLabel,
      address: a.address,
      summary: a.summary,
      date: a.createdAt.toISOString(),
      data: (() => {
        try { return JSON.parse(a.data); } catch { return {}; }
      })(),
    }));

    const formattedAssets = assets.map((a) => ({
      id: a.id,
      address: a.address,
      type: a.type,
      estimatedPrice: a.estimatedPrice,
      jeonsePrice: a.jeonsePrice ?? undefined,
      safetyScore: a.safetyScore,
      riskScore: a.riskScore,
      lastAnalyzedDate: a.lastAnalyzedDate.toISOString(),
      priceHistory: (() => {
        if (!a.priceHistory) return undefined;
        try { return JSON.parse(a.priceHistory); } catch { return undefined; }
      })(),
    }));

    return NextResponse.json({
      analyses: formattedAnalyses,
      assets: formattedAssets,
    });
  } catch (error) {
    console.error("sync-data GET 오류:", error);
    return NextResponse.json({ error: "데이터 조회 실패" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/sync-data
 * 분석 데이터 삭제
 *
 * Body: { analysisId: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return NextResponse.json({ error: "analysisId는 필수입니다." }, { status: 400 });
    }

    await prisma.analysis.deleteMany({
      where: { id: analysisId, userId: session.user.id },
    });

    return NextResponse.json({ ok: true, deleted: analysisId });
  } catch (error) {
    console.error("sync-data DELETE 오류:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
