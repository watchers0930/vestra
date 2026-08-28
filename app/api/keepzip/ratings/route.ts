import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isRatable } from "@/lib/keepzip/case-status";
import { parseScores, avgScore, normalizeComment } from "@/lib/keepzip/rating";

/**
 * GET  /api/keepzip/ratings — 내가 이미 후기를 남긴 사건 id 목록 (UI 중복 방지 표시용)
 * POST /api/keepzip/ratings — 완료된 본인 사건에 변호사 평점 등록 (1사건 1후기)
 *
 * 서버 검증: 로그인 · 본인 사건 · 완료 상태 · 중복 방지. 등록 시 LawyerPartner 집계 동기화.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ratedCaseIds: [] });

  const rows = await prisma.lawyerRating.findMany({
    where: { userId },
    select: { caseId: true },
  });
  return NextResponse.json({ ratedCaseIds: rows.map((r) => r.caseId) });
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const rl = await rateLimit(`keepzip-rating:${userId}`, 20);
    if (!rl.success) return NextResponse.json({ error: "요청 한도 초과." }, { status: 429, headers: rateLimitHeaders(rl) });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const caseId = String(b.caseId ?? "");
    if (!caseId) return NextResponse.json({ error: "사건 정보가 없습니다." }, { status: 400 });

    const parsed = parseScores(b);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const comment = normalizeComment(b.comment);

    // 사건 소유·완료 상태 검증
    const kzCase = await prisma.keepzipCase.findUnique({
      where: { id: caseId },
      select: { id: true, userId: true, lawyerId: true, status: true },
    });
    if (!kzCase) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });
    if (kzCase.userId !== userId) return NextResponse.json({ error: "본인 사건만 평가할 수 있습니다." }, { status: 403 });
    if (!isRatable(kzCase.status)) {
      return NextResponse.json({ error: "완료된 사건만 후기를 남길 수 있습니다." }, { status: 400 });
    }

    // 중복 방지 (1사건 1후기)
    const existing = await prisma.lawyerRating.findUnique({ where: { caseId }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "이미 후기를 등록한 사건입니다." }, { status: 409 });

    const scores = parsed.scores;
    const avg = avgScore(scores);

    // 후기 생성 + LawyerPartner 평점 집계(avgRating·ratingCount) 동기화
    await prisma.$transaction(async (tx) => {
      await tx.lawyerRating.create({
        data: { lawyerId: kzCase.lawyerId, userId, caseId, ...scores, avgScore: avg, comment },
      });
      const agg = await tx.lawyerRating.aggregate({
        where: { lawyerId: kzCase.lawyerId },
        _avg: { avgScore: true },
        _count: { _all: true },
      });
      await tx.lawyerPartner.update({
        where: { id: kzCase.lawyerId },
        data: { avgRating: agg._avg.avgScore ?? 0, ratingCount: agg._count._all },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "후기 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
