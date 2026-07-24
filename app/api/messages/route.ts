import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";
import { sendPushToUser } from "@/lib/push-subscriptions";

const sendSchema = z.object({
  applicationId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

// 채팅방 접근 권한 확인 (임대인 or 신청자만)
async function getAuthorizedApplication(applicationId: string, userId: string) {
  const app = await prisma.contractApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      listing: { select: { ownerId: true, address: true } },
    },
  });
  if (!app) return null;
  const isParticipant = app.applicantId === userId || app.listing.ownerId === userId;
  if (!isParticipant) return null;
  return app;
}

// GET /api/messages?applicationId=xxx&after=ISO
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");
    const after = searchParams.get("after");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId가 필요합니다." }, { status: 400 });
    }

    const app = await getAuthorizedApplication(applicationId, session.user.id);
    if (!app) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        applicationId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        senderId: true,
        content: true,
        readAt: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    });

    // 상대방 메시지 읽음 처리
    const unread = messages.filter(
      (m) => m.senderId !== session.user!.id && !m.readAt
    );
    if (unread.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unread.map((m) => m.id) } },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ messages });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/messages
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const { applicationId, content } = parsed.data;

    const app = await getAuthorizedApplication(applicationId, session.user.id);
    if (!app) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: { applicationId, senderId: session.user.id, content },
      select: {
        id: true, senderId: true, content: true, readAt: true, createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    });

    // 상대방에게 Web Push 알림
    const recipientId =
      session.user.id === app.applicantId
        ? app.listing.ownerId
        : app.applicantId;

    sendPushToUser(recipientId, {
      title: "새 메시지",
      body: `${session.user.name ?? "상대방"}: ${content.slice(0, 60)}`,
      url: `/chat/${applicationId}`,
    }).catch(() => {});

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
