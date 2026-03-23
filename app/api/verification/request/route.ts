/**
 * 상호검증 요청 API
 * POST: 검증 요청 생성
 * GET: 내 검증 요청 목록
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";
import { sendNotification } from "@/lib/notification-sender";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`verification-list:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    // 내가 보낸 요청 + 내가 받은 요청
    const [sent, received] = await Promise.all([
      prisma.verificationRequest.findMany({
        where: { requesterId: session.user.id },
        include: {
          sharedReports: true,
          _count: { select: { sharedReports: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.verificationRequest.findMany({
        where: { targetEmail: session.user.email! },
        include: {
          requester: { select: { name: true, email: true } },
          sharedReports: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ sent, received });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[verification/request] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`verification-create:${ip}`, 5);
    if (!rl.success) {
      return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { targetEmail, targetRole, propertyAddress, analysisId, message } = await req.json();

    // 유효성 검증
    if (!targetEmail || !targetRole || !propertyAddress) {
      return NextResponse.json(
        { error: "상대방 이메일, 역할, 주소는 필수입니다." },
        { status: 400 }
      );
    }

    if (!["landlord", "tenant"].includes(targetRole)) {
      return NextResponse.json(
        { error: "역할은 landlord 또는 tenant여야 합니다." },
        { status: 400 }
      );
    }

    if (targetEmail === session.user.email) {
      return NextResponse.json(
        { error: "본인에게 검증 요청을 보낼 수 없습니다." },
        { status: 400 }
      );
    }

    // 만료일: 7일 후
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        requesterId: session.user.id,
        targetEmail,
        targetRole,
        propertyAddress,
        message: message || null,
        expiresAt,
      },
    });

    // 분석 결과 공유 (동의 포함)
    if (analysisId) {
      await prisma.sharedReport.create({
        data: {
          verificationRequestId: verificationRequest.id,
          analysisId,
          sharedBy: session.user.id,
          consentGiven: true,
          consentAt: new Date(),
        },
      });
    }

    // 상대방에게 알림 시도 (DB에 등록된 사용자인 경우)
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });

    if (targetUser) {
      await sendNotification({
        userId: targetUser.id,
        type: "verification_request",
        title: "[VESTRA] 상호검증 요청이 도착했습니다",
        body: `${session.user.name || session.user.email}님이 ${propertyAddress}에 대한 상호검증을 요청했습니다.`,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "VERIFICATION_REQUESTED",
      target: verificationRequest.id,
      detail: {
        targetEmail,
        targetRole,
        propertyAddress,
      },
      req,
    });

    return NextResponse.json(
      { verificationRequest },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[verification/request] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
