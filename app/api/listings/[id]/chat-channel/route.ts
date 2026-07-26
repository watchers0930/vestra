import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/listings/[id]/chat-channel
// 이 매물에 대한 기존 의향서를 찾거나, 없으면 채팅용 의향서를 자동 생성한다.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: listingId } = await params;
    const userId = session.user.id;

    // 이미 보낸 의향서가 있으면 그대로 반환
    const existing = await prisma.contractApplication.findFirst({
      where: { listingId, applicantId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ applicationId: existing.id });
    }

    // 매물 소유자 확인 (자기 매물에 채팅 불가)
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }
    if (listing.ownerId === userId) {
      return NextResponse.json({ error: "본인 매물에는 채팅할 수 없습니다." }, { status: 400 });
    }

    // 채팅 시작용 의향서 자동 생성 (moveInDate = 오늘 기준 30일 후)
    const moveInDate = new Date();
    moveInDate.setDate(moveInDate.getDate() + 30);

    const application = await prisma.contractApplication.create({
      data: { listingId, applicantId: userId, moveInDate },
      select: { id: true },
    });

    return NextResponse.json({ applicationId: application.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
