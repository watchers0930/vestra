/**
 * 모니터링 등록/조회 API
 * POST: 부동산 모니터링 등록
 * GET: 내 모니터링 목록 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-list:${ip}`, 30);
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

    const properties = await prisma.monitoredProperty.findMany({
      where: { userId: session.user.id },
      include: {
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: { select: { alerts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-add:${ip}`, 10);
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

    const { address } = await req.json();
    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json(
        { error: "유효한 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 중복 확인
    const existing = await prisma.monitoredProperty.findUnique({
      where: {
        userId_address: {
          userId: session.user.id,
          address: address.trim(),
        },
      },
    });

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { error: "이미 모니터링 중인 주소입니다." },
          { status: 409 }
        );
      }
      // 비활성 상태면 재활성화
      const reactivated = await prisma.monitoredProperty.update({
        where: { id: existing.id },
        data: { status: "active" },
      });
      return NextResponse.json({ property: reactivated, reactivated: true });
    }

    // 모니터링 등록 제한 (역할별)
    const monitorCount = await prisma.monitoredProperty.count({
      where: { userId: session.user.id, status: "active" },
    });
    const limits: Record<string, number> = {
      GUEST: 1,
      PERSONAL: 3,
      BUSINESS: 10,
      REALESTATE: 30,
      ADMIN: 100,
    };
    const maxMonitors =
      limits[session.user.role as string] || limits.PERSONAL;
    if (monitorCount >= maxMonitors) {
      return NextResponse.json(
        {
          error: `모니터링 등록 한도(${maxMonitors}건)에 도달했습니다.`,
        },
        { status: 429 }
      );
    }

    const property = await prisma.monitoredProperty.create({
      data: {
        userId: session.user.id,
        address: address.trim(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "MONITORING_REGISTERED",
      target: property.id,
      detail: { address: address.trim() },
      req,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
