/**
 * 등기부 스냅샷 체인 무결성 검증 API
 * GET /api/monitoring/integrity?propertyId=xxx
 *
 * 사용자가 "내 등기부 체인이 위변조되지 않았는지" 확인할 수 있는 엔드포인트.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyPropertyChain } from "@/lib/registry-snapshot-recorder";
import { exportPublicKey } from "@/lib/registry-blockchain";

export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`integrity-check:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 인증
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    // 파라미터 검증
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 본인 물건 확인
    const property = await prisma.monitoredProperty.findFirst({
      where: {
        id: propertyId,
        userId: session.user.id,
      },
      select: { id: true, address: true },
    });

    if (!property) {
      return NextResponse.json(
        { error: "모니터링 물건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 스냅샷 수 조회
    const snapshotCount = await prisma.registrySnapshot.count({
      where: { monitoredPropertyId: propertyId },
    });

    if (snapshotCount === 0) {
      return NextResponse.json({
        verification: null,
        snapshotCount: 0,
        message: "아직 등기부 스냅샷이 없습니다.",
      });
    }

    // 체인 검증
    const verification = await verifyPropertyChain(propertyId);

    // 공개키
    let publicKey: string | null = null;
    try {
      publicKey = exportPublicKey();
    } catch {
      // REGISTRY_SIGNING_SEED 미설정 시 무시
    }

    return NextResponse.json({
      verification,
      snapshotCount,
      publicKey,
      address: property.address,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/integrity] ${message}`);
    return NextResponse.json(
      { error: "무결성 검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
