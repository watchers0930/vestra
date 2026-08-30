import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KeepzipCdPdf } from "@/lib/pdf/keepzip-cd-template";
import { causeLabel, type KeepzipCause } from "@/lib/keepzip/cd-template";

// 직인 완료 이후 상태에서만 미리보기 허용 (직인이 case.stampUrl에 저장돼 있어야 함)
const PREVIEWABLE = ["lawyer_approved", "postal_sent", "delivered"];

/**
 * GET /api/keepzip/cases/[id]/preview-pdf — 직인 찍힌 내용증명 완료본 미리보기 (발송 전 확인용)
 * - 접근: 사건 의뢰인 본인 또는 배정 변호사만.
 * - 직인은 서버가 case.stampUrl(승인 시 변호사 등록 직인 저장분)로 합성 — 클라이언트가 직인을 넘기지 못함.
 * - lawyer_approved(직인 완료) 이후 상태에서만. 응답은 inline PDF.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const kz = await prisma.keepzipCase.findUnique({
      where: { id },
      select: {
        userId: true, lawyerId: true, status: true,
        cause: true, senderName: true, draftContent: true,
        signatureUrl: true, stampUrl: true,
      },
    });
    if (!kz) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });

    // 접근 권한: 의뢰인 본인 또는 배정 변호사
    let allowed = kz.userId === session.user.id;
    if (!allowed) {
      const partner = await prisma.lawyerPartner.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      allowed = !!partner && partner.id === kz.lawyerId;
    }
    if (!allowed) return NextResponse.json({ error: "열람 권한이 없습니다." }, { status: 403 });

    if (!PREVIEWABLE.includes(kz.status)) {
      return NextResponse.json({ error: "변호사 직인 완료 후 미리보기가 가능합니다." }, { status: 409 });
    }
    if (!kz.stampUrl || !kz.draftContent) {
      return NextResponse.json({ error: "완료본 문서가 아직 준비되지 않았습니다." }, { status: 409 });
    }

    // 배정 변호사명 (직인 라벨용)
    const lawyer = await prisma.lawyerPartner.findUnique({
      where: { id: kz.lawyerId },
      select: { name: true },
    });

    const now = new Date();
    const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;
    const title = causeLabel(kz.cause as KeepzipCause);

    const element = React.createElement(KeepzipCdPdf, {
      data: {
        title,
        content: kz.draftContent,
        senderName: kz.senderName,
        signature: kz.signatureUrl ?? undefined,
        date,
        lawyerName: lawyer?.name ?? undefined,
        stamp: kz.stampUrl,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="keepzip-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[GET /api/keepzip/cases/[id]/preview-pdf]", e);
    return NextResponse.json({ error: "미리보기 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
