import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/keepzip/cases/[id] — 내용증명 사건 상세.
 * 접근: 사건 본인(임차인) 또는 배정 변호사만.
 * - 사용자: 마이페이지에서 본문·진행상황 확인
 * - 변호사: 검수 화면에서 원문 열람 → 최초 열람 시 LawyerReview.viewedAt 기록(검토 증빙·승인 게이팅 근거)
 */
type Params = { params: Promise<{ id: string }> };

// 변호사 검수 대상 상태 — 이때 열람하면 viewedAt 기록
const REVIEWABLE = ["lawyer_pending", "paid"];

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { id } = await params;
    const kz = await prisma.keepzipCase.findUnique({
      where: { id },
      select: {
        id: true, userId: true, lawyerId: true,
        cause: true, senderSide: true, senderName: true, recipientName: true,
        address: true, deposit: true, draftContent: true, stampUrl: true,
        status: true, sentAt: true, createdAt: true,
        serviceFee: true, postalFee: true, totalPaid: true,
        tracking: { select: { trackingNo: true, step: true, deliveredAt: true } },
        lawyerReview: { select: { decision: true, stampedAt: true, viewedAt: true, memo: true } },
      },
    });
    if (!kz) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });

    // 접근 권한: 본인 또는 배정 변호사(LawyerPartner)만
    const isOwner = kz.userId === userId;
    let isAssignedLawyer = false;
    if (!isOwner) {
      const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
      isAssignedLawyer = !!partner && partner.id === kz.lawyerId;
    }
    if (!isOwner && !isAssignedLawyer) {
      return NextResponse.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    // 배정 변호사가 검수 대상 사건을 열람 → 최초 열람 시각 기록(승인 게이팅 근거)
    if (isAssignedLawyer && REVIEWABLE.includes(kz.status) && !kz.lawyerReview?.viewedAt) {
      await prisma.lawyerReview.upsert({
        where: { caseId: id },
        create: { caseId: id, lawyerId: kz.lawyerId, viewedAt: new Date() },
        update: { viewedAt: new Date() },
      });
    }

    // BigInt(deposit) 직렬화 — 문자열로
    const { deposit, ...rest } = kz;
    return NextResponse.json({
      case: {
        ...rest,
        deposit: deposit != null ? deposit.toString() : null,
        viewerRole: isOwner ? "owner" : "lawyer",
      },
    });
  } catch (e) {
    console.error("[GET /api/keepzip/cases/[id]]", e);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
