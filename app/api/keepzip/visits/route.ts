import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";

/**
 * POST  /api/keepzip/visits — 방문 예약 신청 (이용자 → 전문가)
 * GET   /api/keepzip/visits?as=lawyer — 로그인 전문가의 방문 예약
 * PATCH /api/keepzip/visits — 예약 확정 (변호사)
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await rateLimit(`kz-visit:${userId ?? ip}`, 10, 86400000);
    if (!rl.success) return NextResponse.json({ error: "일일 신청 한도를 초과했습니다." }, { status: 429, headers: rateLimitHeaders(rl) });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const lawyerId = sanitizeField(String(b.lawyerId ?? ""), 50);
    const name = sanitizeField(String(b.name ?? ""), 100);
    const phone = sanitizeField(String(b.phone ?? ""), 30);
    const preferredAt = sanitizeField(String(b.preferredAt ?? ""), 100);
    const purpose = sanitizeField(String(b.purpose ?? ""), 300);
    if (!lawyerId || !name || !phone || !preferredAt) {
      return NextResponse.json({ error: "전문가·성명·연락처·희망 일시를 입력해주세요." }, { status: 400 });
    }
    // 전문가 실존·활성 검증(공통B) — 임의 lawyerId 주입·표적 스팸 방지
    const partner = await prisma.lawyerPartner.findUnique({ where: { id: lawyerId }, select: { id: true, active: true } });
    if (!partner || !partner.active) {
      return NextResponse.json({ error: "유효한 전문가가 아닙니다." }, { status: 400 });
    }

    const created = await prisma.expertVisit.create({
      data: { lawyerId, userId, name, phone, preferredAt, purpose: purpose || "방문 상담" },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[POST /api/keepzip/visits]", e);
    return NextResponse.json({ error: "예약 신청 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  if (req.nextUrl.searchParams.get("as") !== "lawyer") return NextResponse.json({ visits: [] });
  const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
  if (!partner) return NextResponse.json({ visits: [] });

  const visits = await prisma.expertVisit.findMany({
    where: { lawyerId: partner.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ visits });
}

export async function PATCH(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return NextResponse.json({ error: "전문가만 확정할 수 있습니다." }, { status: 403 });

    const b = await req.json().catch(() => null);
    const id = sanitizeField(String(b?.id ?? ""), 50);
    if (!id) return NextResponse.json({ error: "예약 ID가 필요합니다." }, { status: 400 });

    const visit = await prisma.expertVisit.findUnique({ where: { id }, select: { lawyerId: true } });
    if (!visit || visit.lawyerId !== partner.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    await prisma.expertVisit.update({ where: { id }, data: { status: "confirmed" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/keepzip/visits]", e);
    return NextResponse.json({ error: "확정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
