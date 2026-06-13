/**
 * 모니터링 물건 단일 상세 조회 API
 * GET /api/monitoring/{id}
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-detail:${ip}`, 30);
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

    const { id } = await params;
    const uid = session.user.id;

    // 소유자 또는 알림 수신자(중개사↔고객 연결)인 경우 모두 조회 허용
    const property = await prisma.monitoredProperty.findFirst({
      where: {
        id,
        OR: [
          { userId: uid },
          {
            agentClientProperties: {
              some: {
                status: "active",
                agentClient: {
                  OR: [
                    { agentId: uid },
                    { clientUserId: uid },
                  ],
                },
              },
            },
          },
        ],
      },
      include: {
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { snapshots: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "물건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      property: {
        ...property,
        snapshotCount: property._count.snapshots,
        _count: undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/${(error as Error)?.name}] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // 소유자만 삭제 가능 (에이전트/고객 연결은 삭제 불가)
    const property = await prisma.monitoredProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!property) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    // Cascade: MonitoringAlert, MonitoringSnapshot 자동 삭제
    await prisma.monitoredProperty.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/[id] DELETE] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
