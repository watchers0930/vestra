import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { getClientIp } from "@/lib/client-ip";

/**
 * POST /api/keepzip/consults — 전문가 상담문의 신청 (이용자 → 전문가)
 * GET  /api/keepzip/consults?as=lawyer — 로그인 전문가에게 온 상담문의
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ip = getClientIp(req);

    const rl = await rateLimit(`kz-consult:${userId ?? ip}`, 10, 86400000);
    if (!rl.success) return NextResponse.json({ error: "일일 신청 한도를 초과했습니다." }, { status: 429, headers: rateLimitHeaders(rl) });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const lawyerId = sanitizeField(String(b.lawyerId ?? ""), 50);
    const name = sanitizeField(String(b.name ?? ""), 100);
    const phone = sanitizeField(String(b.phone ?? ""), 30);
    const topic = sanitizeField(String(b.topic ?? ""), 200);
    const content = String(b.content ?? "").slice(0, 5000);
    if (!lawyerId || !name || !phone || !content.trim()) {
      return NextResponse.json({ error: "전문가·성명·연락처·상담 내용을 입력해주세요." }, { status: 400 });
    }
    // 전문가 실존·활성 검증(공통B) — 임의 lawyerId 주입·표적 스팸 방지
    const partner = await prisma.lawyerPartner.findUnique({ where: { id: lawyerId }, select: { id: true, active: true } });
    if (!partner || !partner.active) {
      return NextResponse.json({ error: "유효한 전문가가 아닙니다." }, { status: 400 });
    }

    const created = await prisma.expertConsult.create({
      data: { lawyerId, userId, name, phone, topic: topic || "상담 문의", content },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[POST /api/keepzip/consults]", e);
    return NextResponse.json({ error: "상담 신청 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  if (req.nextUrl.searchParams.get("as") !== "lawyer") return NextResponse.json({ consults: [] });
  const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
  if (!partner) return NextResponse.json({ consults: [] });

  const consults = await prisma.expertConsult.findMany({
    where: { lawyerId: partner.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ consults });
}
