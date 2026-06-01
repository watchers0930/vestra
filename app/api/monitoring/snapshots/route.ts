/**
 * 등기 스냅샷 목록 조회 API
 * GET /api/monitoring/snapshots?propertyId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-snapshots:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId가 필요합니다." },
        { status: 400 }
      );
    }

    // 소유권 확인
    const property = await prisma.monitoredProperty.findFirst({
      where: { id: propertyId, userId: session.user.id },
    });
    if (!property) {
      return NextResponse.json(
        { error: "물건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // encryptedData 제외하고 반환
    const snapshots = await prisma.registrySnapshot.findMany({
      where: { monitoredPropertyId: propertyId },
      select: {
        id: true,
        sequenceNo: true,
        merkleRoot: true,
        snapshotHash: true,
        previousSnapshotHash: true,
        signature: true,
        sectionHashes: true,
        timestamp: true,
      },
      orderBy: { sequenceNo: "asc" },
    });

    return NextResponse.json({ snapshots, total: snapshots.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/snapshots] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
