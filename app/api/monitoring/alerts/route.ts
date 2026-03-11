/**
 * 모니터링 알림 조회/관리 API
 * GET: 알림 목록 조회
 * PATCH: 알림 읽음 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-alerts:${ip}`, 30);
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
    const unreadOnly = searchParams.get("unread") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = 20;

    const where = {
      monitoredProperty: { userId: session.user.id },
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [alerts, total] = await Promise.all([
      prisma.monitoringAlert.findMany({
        where,
        include: {
          monitoredProperty: {
            select: { address: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.monitoringAlert.count({ where }),
    ]);

    const unreadCount = await prisma.monitoringAlert.count({
      where: {
        monitoredProperty: { userId: session.user.id },
        isRead: false,
      },
    });

    return NextResponse.json({
      alerts,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { alertIds, markAll } = await req.json();

    if (markAll) {
      // 모든 읽지 않은 알림 읽음 처리
      const result = await prisma.monitoringAlert.updateMany({
        where: {
          monitoredProperty: { userId: session.user.id },
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "alertIds 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 소유권 확인 후 읽음 처리
    const result = await prisma.monitoringAlert.updateMany({
      where: {
        id: { in: alertIds },
        monitoredProperty: { userId: session.user.id },
      },
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
