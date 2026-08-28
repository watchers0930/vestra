import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

/**
 * PATCH /api/keepzip/consults/[id] — 상담 일정 조율
 * body: { action: "accept" | "propose" | "confirm", proposedAt?: string }
 * - accept  (변호사): 이용자 희망시간 수락 → accepted, confirmedAt=preferredAt
 * - propose (변호사): 다른 시간 역제안   → proposed, proposedAt=제안시간
 * - confirm (이용자): 변호사 제안 수락    → confirmed, confirmedAt=proposedAt
 */
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { id } = await params;
    const c = await prisma.expertConsult.findUnique({
      where: { id },
      select: { id: true, lawyerId: true, userId: true, status: true, preferredAt: true, proposedAt: true },
    });
    if (!c) return NextResponse.json({ error: "상담을 찾을 수 없습니다." }, { status: 404 });

    const b = await req.json().catch(() => null);
    const action = b?.action;

    // 이용자 본인: 변호사 역제안 수락
    if (action === "confirm") {
      if (c.userId !== userId) return NextResponse.json({ error: "본인 상담만 수락할 수 있습니다." }, { status: 403 });
      if (c.status !== "proposed") return NextResponse.json({ error: "제안된 상담만 수락할 수 있습니다." }, { status: 409 });
      await prisma.expertConsult.update({ where: { id }, data: { status: "confirmed", confirmedAt: c.proposedAt } });
      return NextResponse.json({ ok: true, status: "confirmed" });
    }

    // 변호사: 수락/역제안 (배정된 상담만)
    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner || c.lawyerId !== partner.id) {
      return NextResponse.json({ error: "배정된 상담만 응답할 수 있습니다." }, { status: 403 });
    }

    if (action === "accept") {
      await prisma.expertConsult.update({ where: { id }, data: { status: "accepted", confirmedAt: c.preferredAt } });
      return NextResponse.json({ ok: true, status: "accepted" });
    }

    if (action === "propose") {
      const pt = b?.proposedAt ? new Date(String(b.proposedAt)) : null;
      if (!pt || isNaN(pt.getTime())) return NextResponse.json({ error: "제안할 시간을 선택해 주세요." }, { status: 400 });
      await prisma.expertConsult.update({ where: { id }, data: { status: "proposed", proposedAt: pt } });
      return NextResponse.json({ ok: true, status: "proposed" });
    }

    return NextResponse.json({ error: "action은 accept·propose·confirm 중 하나여야 합니다." }, { status: 400 });
  } catch (e) {
    console.error("[PATCH /api/keepzip/consults/[id]]", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
