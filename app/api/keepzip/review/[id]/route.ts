import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { sanitizeField } from "@/lib/sanitize";

// 검수 가능한 시작 상태 — 검수 전(대기/결제완료)만 승인·반려 허용
const REVIEWABLE = ["lawyer_pending", "paid"];

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/keepzip/review/[id] — 변호사 검수·전자직인 (설계서 §6·§9)
 * body: { decision: "approved" | "rejected", reason?: string }
 *
 * 무내용 승인 방지(P0~P2):
 * - 승인은 문서 원문을 열람(GET /cases/[id] → LawyerReview.viewedAt 기록)한 뒤에만 가능.
 * - 직인은 body로 받지 않고 서버가 변호사 등록 직인(LawyerPartner.stampImageUrl)을 사용.
 * - 승인 시 열람~승인 소요시간(reviewSeconds)을 증빙으로 기록.
 * - 반려는 사유(memo) 필수.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // 전문가(변호사) 본인만 — 등록 직인도 함께 조회
    const partner = await prisma.lawyerPartner.findUnique({
      where: { userId },
      select: { id: true, stampImageUrl: true },
    });
    if (!partner) return NextResponse.json({ error: "전문가만 검수할 수 있습니다." }, { status: 403 });

    const { id } = await params;
    const kzCase = await prisma.keepzipCase.findUnique({
      where: { id },
      select: { id: true, status: true, lawyerId: true, draftContent: true, originalDraft: true, lawyerReview: { select: { viewedAt: true } } },
    });
    if (!kzCase) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });
    // 본인에게 배정된 사건만 검수 가능
    if (kzCase.lawyerId !== partner.id) return NextResponse.json({ error: "배정된 사건만 검수할 수 있습니다." }, { status: 403 });
    // 상태 전이 가드(M3): 이미 승인·발송·배달·취소된 사건 재처리 차단
    if (!REVIEWABLE.includes(kzCase.status)) {
      return NextResponse.json({ error: "이미 처리된 사건입니다." }, { status: 409 });
    }

    const b = await req.json().catch(() => null);
    if (!["approved", "rejected", "revised"].includes(b?.decision)) {
      return NextResponse.json({ error: "decision은 approved, rejected, revised 중 하나여야 합니다." }, { status: 400 });
    }

    // 수정 → 이용자 재확인 대기(lawyer_revised). 본문을 변호사가 직접 편집, 최초 수정 시 원본 백업.
    if (b.decision === "revised") {
      const newDraft = String(b?.draftContent ?? "").trim();
      if (!newDraft) return NextResponse.json({ error: "수정할 본문을 입력해 주세요." }, { status: 400 });
      if (newDraft.length > 20000) return NextResponse.json({ error: "본문이 너무 깁니다." }, { status: 400 });
      const reason = sanitizeField(String(b?.reason ?? ""), 500) || null; // 수정 사유(선택)
      const backup = kzCase.originalDraft == null ? { originalDraft: kzCase.draftContent } : {};
      await prisma.$transaction([
        prisma.keepzipCase.update({
          where: { id },
          data: { status: "lawyer_revised", draftContent: newDraft, ...backup },
        }),
        prisma.lawyerReview.upsert({
          where: { caseId: id },
          create: { caseId: id, lawyerId: partner.id, decision: "revised", memo: reason, viewedAt: new Date() },
          update: { decision: "revised", memo: reason },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "lawyer_revised" });
    }

    if (b.decision === "approved") {
      // P0: 문서 원문 열람 없이는 승인 불가 (서버 강제)
      const viewedAt = kzCase.lawyerReview?.viewedAt;
      if (!viewedAt) {
        return NextResponse.json({ error: "문서 원문을 열람한 뒤에 승인·직인할 수 있습니다." }, { status: 428 });
      }
      // P2: 등록 직인 필수 (canvas 즉석생성 폐지)
      if (!partner.stampImageUrl) {
        return NextResponse.json({ error: "등록된 전자직인이 없습니다. 프로필에서 직인을 먼저 등록해 주세요." }, { status: 428 });
      }
      const reviewSeconds = Math.max(0, Math.round((Date.now() - new Date(viewedAt).getTime()) / 1000));
      await prisma.$transaction([
        prisma.keepzipCase.update({
          where: { id },
          data: { status: "lawyer_approved", stampUrl: partner.stampImageUrl },
        }),
        prisma.lawyerReview.upsert({
          where: { caseId: id },
          create: { caseId: id, lawyerId: partner.id, decision: "approved", stampedAt: new Date(), viewedAt, reviewSeconds },
          update: { decision: "approved", stampedAt: new Date(), reviewSeconds },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "lawyer_approved", reviewSeconds });
    }

    // 반려 → 취소(발송 전 환불 대상). P1: 사유 필수
    const reason = sanitizeField(String(b?.reason ?? ""), 500);
    if (!reason) {
      return NextResponse.json({ error: "반려 사유를 입력해 주세요." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.keepzipCase.update({ where: { id }, data: { status: "canceled" } }),
      prisma.lawyerReview.upsert({
        where: { caseId: id },
        create: { caseId: id, lawyerId: partner.id, decision: "rejected", memo: reason },
        update: { decision: "rejected", memo: reason },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "canceled" });
  } catch (e) {
    console.error("[PATCH /api/keepzip/review/[id]]", e);
    return NextResponse.json({ error: "검수 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
