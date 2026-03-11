/**
 * 개별 공유 보고서 조회 API
 * GET: 검증 요청 ID 기반 공유 보고서 조회 (동적 라우트)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id: requestId } = await params;

    // 검증 요청 조회
    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!verificationRequest) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 참여자 확인
    const isRequester = verificationRequest.requesterId === session.user.id;
    const isTarget = verificationRequest.targetEmail === session.user.email;

    if (!isRequester && !isTarget) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (verificationRequest.status !== "accepted") {
      return NextResponse.json(
        { error: "수락된 요청의 보고서만 조회할 수 있습니다." },
        { status: 403 }
      );
    }

    // 동의된 공유 보고서 + 분석 데이터
    const sharedReports = await prisma.sharedReport.findMany({
      where: {
        verificationRequestId: requestId,
        consentGiven: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const analysisIds = sharedReports.map((r) => r.analysisId);
    const analyses = await prisma.analysis.findMany({
      where: { id: { in: analysisIds } },
      select: {
        id: true,
        type: true,
        typeLabel: true,
        address: true,
        summary: true,
        data: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      verificationRequest: {
        id: verificationRequest.id,
        propertyAddress: verificationRequest.propertyAddress,
        status: verificationRequest.status,
        targetRole: verificationRequest.targetRole,
        createdAt: verificationRequest.createdAt,
        expiresAt: verificationRequest.expiresAt,
      },
      sharedReports,
      analyses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
