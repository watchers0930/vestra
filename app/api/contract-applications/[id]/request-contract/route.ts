import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { sendPushToUser } from "@/lib/push-subscriptions";

// POST /api/contract-applications/[id]/request-contract
// 신청자(개인)가 수락된 의향서에 대해 소유주(업자)에게 "가계약서 작성"을 요청한다. (양방향 트리거)
// 계약서 작성권은 여전히 업자에게 있으며, 여기서는 요청(신호)만 보낸다.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const application = await prisma.contractApplication.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        status: true,
        contractRequestedAt: true,
        listing: { select: { ownerId: true, address: true } },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "의향서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 본인(신청자)만 요청 가능
    if (application.applicantId !== session.user.id) {
      return NextResponse.json({ error: "본인 의향서만 요청할 수 있습니다." }, { status: 403 });
    }
    // 수락된 의향서만 가계약 요청 가능
    if (application.status !== "ACCEPTED") {
      return NextResponse.json({ error: "수락된 의향서만 가계약을 요청할 수 있습니다." }, { status: 409 });
    }

    // 멱등: 이미 요청한 경우 기존 시각 그대로 반환 (중복 알림 방지)
    if (application.contractRequestedAt) {
      return NextResponse.json({ id: application.id, contractRequestedAt: application.contractRequestedAt });
    }

    const updated = await prisma.contractApplication.update({
      where: { id },
      data: { contractRequestedAt: new Date() },
      select: { id: true, contractRequestedAt: true },
    });

    // 소유주(업자)에게 가계약 요청 알림
    sendPushToUser(application.listing.ownerId, {
      title: "가계약서 작성 요청이 도착했습니다",
      body: `${application.listing.address} 매물의 임차인/매수인이 가계약서 작성을 요청했습니다.`,
      url: "/profile",
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
