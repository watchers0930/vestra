/**
 * 전세사기 피해사례 데이터 API
 * GET: 바운딩박스 기반 공간 쿼리
 * POST: 관리자 데이터 임포트
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`fraud-cases:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(req.url);
    const minLat = parseFloat(searchParams.get("minLat") || "33");
    const maxLat = parseFloat(searchParams.get("maxLat") || "39");
    const minLng = parseFloat(searchParams.get("minLng") || "124");
    const maxLng = parseFloat(searchParams.get("maxLng") || "132");
    const caseType = searchParams.get("caseType");
    const verifiedOnly = searchParams.get("verified") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

    const where: Record<string, unknown> = {
      latitude: { gte: minLat, lte: maxLat },
      longitude: { gte: minLng, lte: maxLng },
    };

    if (caseType) where.caseType = caseType;
    if (verifiedOnly) where.verified = true;

    const cases = await prisma.fraudCase.findMany({
      where,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        caseType: true,
        amount: true,
        victimCount: true,
        reportDate: true,
        source: true,
        summary: true,
        verified: true,
      },
      take: limit,
      orderBy: { reportDate: "desc" },
    });

    // 히트맵용 집계 데이터
    const heatData = cases.map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
      intensity: calculateIntensity(c.amount, c.victimCount),
      label: c.summary?.slice(0, 30) || c.caseType,
    }));

    return NextResponse.json({
      cases,
      heatData,
      total: cases.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}

/** 피해 규모 기반 위험 강도 계산 (0~1) */
function calculateIntensity(
  amount: number | null,
  victimCount: number | null
): number {
  let intensity = 0.3; // 기본값

  if (amount) {
    if (amount >= 10_000_000_000) intensity = 1.0; // 100억 이상
    else if (amount >= 1_000_000_000) intensity = 0.9; // 10억 이상
    else if (amount >= 500_000_000) intensity = 0.8; // 5억 이상
    else if (amount >= 100_000_000) intensity = 0.6; // 1억 이상
    else intensity = 0.4;
  }

  if (victimCount) {
    if (victimCount >= 50) intensity = Math.max(intensity, 0.95);
    else if (victimCount >= 20) intensity = Math.max(intensity, 0.8);
    else if (victimCount >= 5) intensity = Math.max(intensity, 0.6);
  }

  return Math.min(1.0, intensity);
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
    }

    const { cases } = await req.json();

    if (!Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: "cases 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 배치 임포트 (최대 100건)
    const toImport = cases.slice(0, 100);
    let imported = 0;

    for (const c of toImport) {
      if (!c.address || !c.latitude || !c.longitude || !c.caseType) continue;

      await prisma.fraudCase.create({
        data: {
          address: c.address,
          latitude: c.latitude,
          longitude: c.longitude,
          caseType: c.caseType,
          amount: c.amount || null,
          victimCount: c.victimCount || null,
          reportDate: c.reportDate ? new Date(c.reportDate) : null,
          source: c.source || "government",
          sourceUrl: c.sourceUrl || null,
          summary: c.summary || null,
          verified: c.verified || false,
        },
      });
      imported++;
    }

    return NextResponse.json({
      imported,
      total: toImport.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
