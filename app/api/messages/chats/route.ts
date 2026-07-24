import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/messages/chats — 내가 참여 중인 채팅방 목록
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;

    // 임대인(받은 의향서) + 임차인(보낸 의향서) 모두 조회
    const applications = await prisma.contractApplication.findMany({
      where: {
        OR: [
          { applicantId: userId },
          { listing: { ownerId: userId } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        applicant: { select: { id: true, name: true } },
        listing: {
          select: {
            address: true,
            listingType: true,
            owner: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, readAt: true },
        },
      },
    });

    const chats = applications.map((a) => {
      const isOwner = a.listing.owner.id === userId;
      const partner = isOwner ? a.applicant : a.listing.owner;
      const lastMsg = a.messages[0] ?? null;
      const unread = a.messages.filter((m) => m.senderId !== userId && !m.readAt).length;
      return {
        applicationId: a.id,
        status: a.status,
        address: a.listing.address,
        listingType: a.listing.listingType,
        partner,
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt }
          : null,
        unreadCount: unread,
        updatedAt: a.updatedAt,
      };
    });

    return NextResponse.json({ chats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
