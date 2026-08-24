import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

/**
 * GET   /api/notifications — 내 in-app 알림 목록 + 안읽음 수(권고2)
 * PATCH /api/notifications — 읽음 처리 ({ id } 단건 또는 { all: true } 전체)
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, data: n.data,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  });
}

export async function PATCH(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json().catch(() => null);
  const now = new Date();

  if (b?.all === true) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } });
    return NextResponse.json({ ok: true });
  }
  const id = typeof b?.id === "string" ? b.id : null;
  if (!id) return NextResponse.json({ error: "알림 ID가 필요합니다." }, { status: 400 });
  // 본인 알림만 읽음 처리(IDOR 방지) — updateMany + userId 조건
  await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: now } });
  return NextResponse.json({ ok: true });
}
