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
    // 사용자가 위조로 삽입한 분석 마커는 제거한다(신뢰된 마커는 서버만 생성).
    let content = String(b.content ?? "").slice(0, 5000).replace(/\[\[VS_ANALYSIS:[^\]]*\]\]/g, "").trim();
    if (!lawyerId || !name || !phone || !content) {
      return NextResponse.json({ error: "전문가·성명·연락처·상담 내용을 입력해주세요." }, { status: 400 });
    }
    // 전문가 실존·활성 검증(공통B) — 임의 lawyerId 주입·표적 스팸 방지
    const partner = await prisma.lawyerPartner.findUnique({ where: { id: lawyerId }, select: { id: true, active: true } });
    if (!partner || !partner.active) {
      return NextResponse.json({ error: "유효한 전문가가 아닙니다." }, { status: 400 });
    }

    // AI 분석 원문 공개 동의 — analysisId가 신청자 본인 소유일 때만 상담에 연결한다(content 마커).
    // 서버가 소유권을 검증하므로, 전문가는 이 상담에 연결된 신청자 분석만 열람할 수 있다.
    const analysisId = b.analysisId ? sanitizeField(String(b.analysisId), 50) : "";
    if (analysisId && userId) {
      const owned = await prisma.analysis.findFirst({ where: { id: analysisId, userId }, select: { id: true } });
      if (owned) content = `${content}\n\n[[VS_ANALYSIS:${owned.id}]]`;
    }

    // 희망 상담 시간 (datetime-local 문자열)
    const pref = b.preferredAt ? new Date(String(b.preferredAt)) : null;
    const preferredAt = pref && !isNaN(pref.getTime()) ? pref : null;

    const created = await prisma.expertConsult.create({
      data: { lawyerId, userId, name, phone, topic: topic || "상담 문의", content, preferredAt },
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

  // 변호사 대시보드: 배정된 상담
  if (req.nextUrl.searchParams.get("as") === "lawyer") {
    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return NextResponse.json({ consults: [] });
    const consults = await prisma.expertConsult.findMany({
      where: { lawyerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ consults });
  }

  // 이용자 본인: 내가 신청한 상담 + 담당 전문가명
  const consults = await prisma.expertConsult.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const ids = [...new Set(consults.map((c) => c.lawyerId))];
  const partners = await prisma.lawyerPartner.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, category: true } });
  const nm = Object.fromEntries(partners.map((p) => [p.id, { name: p.name ?? "전문가", category: p.category }]));
  const withName = consults.map((c) => ({ ...c, lawyerName: nm[c.lawyerId]?.name ?? "전문가" }));
  return NextResponse.json({ consults: withName });
}
