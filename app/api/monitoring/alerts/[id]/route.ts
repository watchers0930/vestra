/**
 * 개별 모니터링 알림 관리 API
 * PATCH: 개별 알림 읽음/안읽음 토글
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";

export async function PATCH(
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

    // 소유권 확인
    const alert = await prisma.monitoringAlert.findFirst({
      where: {
        id,
        monitoredProperty: { userId: session.user.id },
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "알림을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const isRead = typeof body.isRead === "boolean" ? body.isRead : !alert.isRead;

    const updated = await prisma.monitoringAlert.update({
      where: { id },
      data: { isRead },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/alerts] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
