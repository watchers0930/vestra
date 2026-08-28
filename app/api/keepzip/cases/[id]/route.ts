import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { sanitizeField } from "@/lib/sanitize";
import { isValidImageDataUrl } from "@/lib/keepzip/image-validation";

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
        address: true, deposit: true, draftContent: true, originalDraft: true, stampUrl: true,
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

/**
 * PATCH /api/keepzip/cases/[id] — 이용자의 변호사 수정본 재확인.
 * 사건 본인만, status=lawyer_revised 에서만.
 * body: { action: "accept", signature } — 재서명 후 동의 → 직인·발송 준비(lawyer_approved)
 *       { action: "request_rewrite", reason } — 재수정 요청 → 변호사 재검토(lawyer_pending)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { id } = await params;
    const kz = await prisma.keepzipCase.findUnique({
      where: { id },
      select: { id: true, userId: true, lawyerId: true, status: true },
    });
    if (!kz) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });
    if (kz.userId !== userId) return NextResponse.json({ error: "본인 사건만 처리할 수 있습니다." }, { status: 403 });
    if (kz.status !== "lawyer_revised") {
      return NextResponse.json({ error: "지금 확인할 수 있는 상태가 아닙니다." }, { status: 409 });
    }

    const b = await req.json().catch(() => null);
    const action = b?.action;

    // 동의 → 재서명(본문 변경분 반영) 후 변호사 직인·발송 준비
    if (action === "accept") {
      if (!isValidImageDataUrl(b?.signature)) {
        return NextResponse.json({ error: "동의 서명을 다시 입력해 주세요." }, { status: 400 });
      }
      const partner = await prisma.lawyerPartner.findUnique({
        where: { id: kz.lawyerId },
        select: { stampImageUrl: true },
      });
      if (!partner?.stampImageUrl) {
        return NextResponse.json({ error: "변호사 전자직인이 없어 발송할 수 없습니다." }, { status: 428 });
      }
      await prisma.$transaction([
        prisma.keepzipCase.update({
          where: { id },
          data: { status: "lawyer_approved", signatureUrl: b.signature, stampUrl: partner.stampImageUrl },
        }),
        prisma.lawyerReview.upsert({
          where: { caseId: id },
          create: { caseId: id, lawyerId: kz.lawyerId, decision: "approved", stampedAt: new Date() },
          update: { decision: "approved", stampedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "lawyer_approved" });
    }

    // 재수정 요청 → 변호사에게 되돌림
    if (action === "request_rewrite") {
      const reason = sanitizeField(String(b?.reason ?? ""), 500);
      if (!reason) return NextResponse.json({ error: "재수정 요청 사유를 입력해 주세요." }, { status: 400 });
      await prisma.$transaction([
        prisma.keepzipCase.update({ where: { id }, data: { status: "lawyer_pending" } }),
        prisma.lawyerReview.upsert({
          where: { caseId: id },
          create: { caseId: id, lawyerId: kz.lawyerId, decision: "revise_requested", memo: reason },
          update: { decision: "revise_requested", memo: reason },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "lawyer_pending" });
    }

    return NextResponse.json({ error: "action은 accept 또는 request_rewrite여야 합니다." }, { status: 400 });
  } catch (e) {
    console.error("[PATCH /api/keepzip/cases/[id]]", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
