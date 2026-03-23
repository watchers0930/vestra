/**
 * 상호검증 응답 API
 * POST: 검증 요청 수락/거절
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";
import { sendNotification } from "@/lib/notification-sender";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { requestId, action, analysisId } = await req.json();

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId와 action(accept/reject)이 필요합니다." },
        { status: 400 }
      );
    }

    // 검증 요청 조회 (본인 대상인지 확인)
    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { requester: { select: { id: true, name: true, email: true } } },
    });

    if (!request) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (request.targetEmail !== session.user.email) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: `이미 ${request.status} 상태인 요청입니다.` },
        { status: 409 }
      );
    }

    if (new Date() > request.expiresAt) {
      await prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "만료된 요청입니다." }, { status: 410 });
    }

    // 상태 업데이트
    const newStatus = action === "accept" ? "accepted" : "rejected";
    const updated = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    // 수락 시 분석 결과 공유
    if (action === "accept" && analysisId) {
      await prisma.sharedReport.create({
        data: {
          verificationRequestId: requestId,
          analysisId,
          sharedBy: session.user.id,
          consentGiven: true,
          consentAt: new Date(),
        },
      });
    }

    // 요청자에게 알림
    await sendNotification({
      userId: request.requesterId,
      type: "verification_response",
      title: `[VESTRA] 상호검증 ${action === "accept" ? "수락" : "거절"}됨`,
      body: `${session.user.name || session.user.email}님이 ${request.propertyAddress}에 대한 상호검증을 ${action === "accept" ? "수락" : "거절"}했습니다.`,
    });

    await createAuditLog({
      userId: session.user.id,
      action: `VERIFICATION_${action.toUpperCase()}`,
      target: requestId,
      req,
    });

    return NextResponse.json({ verificationRequest: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[verification/respond] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
