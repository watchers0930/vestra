/**
 * 공유된 보고서 조회 API
 * GET: 검증 요청에 연결된 공유 보고서 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId가 필요합니다." },
        { status: 400 }
      );
    }

    // 검증 요청의 참여자인지 확인
    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!verificationRequest) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

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

    // 공유된 보고서 조회 (동의된 것만)
    const sharedReports = await prisma.sharedReport.findMany({
      where: {
        verificationRequestId: requestId,
        consentGiven: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 분석 데이터 조회
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
        createdAt: verificationRequest.createdAt,
      },
      sharedReports,
      analyses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
