import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

/**
 * POST /api/keepzip/cases/[id]/demo-advance — mock 상태 전이 (데모 전용)
 *
 * ⚠️ 데모/테스트 전용. KEEPZIP_DEMO=1 환경에서만 동작(운영 기본 차단).
 * 실서비스에서는 승인=변호사 대시보드, 결제=토스 confirm, 발송=포스트플러스,
 * 추적=우체국 종적조회 API가 각각 대체한다. 본 라우트는 실 결제/정산/발송을 하지 않는다.
 *
 * body: { action: "approve" | "pay" | "deliver" | "return"
 *                 | "resolve" | "unrespond" | "payment_order" | "litigation" | "public_notice" }
 */
type Params = { params: Promise<{ id: string }> };

// 각 action이 허용되는 시작 상태 (순서 강제 — 서버 검증)
const FROM: Record<string, string> = {
  approve: "lawyer_pending",
  pay: "lawyer_approved",
  deliver: "postal_sent",
  return: "postal_sent",
  // 발송 후 프로세스
  resolve: "delivered", // 이행기한 내 임대인 대응 → 종결
  unrespond: "delivered", // 이행기한 경과 미대응
  payment_order: "unresponded", // 지급명령 신청
  litigation: "unresponded", // 변호사 선임(소송) 상담
  public_notice: "returned", // 반송 → 공시송달
};

// 단순 상태 전이(부가 처리 없음) — action → 다음 status
const SIMPLE_TO: Record<string, string> = {
  resolve: "closed",
  unrespond: "unresponded",
  payment_order: "payment_order",
  litigation: "litigation",
  public_notice: "public_notice",
};

function genTrackingNo(): string {
  const d = () => String(randomInt(0, 10000)).padStart(4, "0");
  return `${d()}-${d()}-${d()}`;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    if (process.env.KEEPZIP_DEMO !== "1") {
      return NextResponse.json({ error: "데모 모드가 비활성화되어 있습니다." }, { status: 403 });
    }

    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const b = await req.json().catch(() => null);
    const action = String(b?.action ?? "");
    if (!(action in FROM)) return NextResponse.json({ error: "잘못된 action입니다." }, { status: 400 });

    const { id } = await params;
    const kz = await prisma.keepzipCase.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
    if (!kz) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });
    // 본인 사건만 (데모 전이는 임차인 본인)
    if (kz.userId !== userId) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    // 상태 전이 가드 — 순서에 맞는 전이만 허용
    if (kz.status !== FROM[action]) {
      return NextResponse.json({ error: `현재 상태(${kz.status})에서 할 수 없는 작업입니다.` }, { status: 409 });
    }

    if (action === "approve") {
      await prisma.keepzipCase.update({ where: { id }, data: { status: "lawyer_approved" } });
      return NextResponse.json({ ok: true, status: "lawyer_approved" });
    }

    if (action === "pay") {
      // 결제 + 발송을 하나로(데모). orderId로 결제 증빙, tracking 발급.
      const trackingNo = genTrackingNo();
      const orderId = `demo_${id.slice(0, 8)}_${Date.now()}`;
      await prisma.$transaction([
        prisma.keepzipCase.update({
          where: { id },
          data: { status: "postal_sent", orderId, sentAt: new Date(), settlementStatus: "hold" },
        }),
        prisma.postalTracking.upsert({
          where: { caseId: id },
          create: { caseId: id, trackingNo, step: 3, provider: "demo" },
          update: { trackingNo, step: 3, provider: "demo" },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "postal_sent", trackingNo });
    }

    if (action === "deliver") {
      const deliveredAt = new Date();
      await prisma.$transaction([
        prisma.keepzipCase.update({ where: { id }, data: { status: "delivered" } }),
        prisma.postalTracking.update({ where: { caseId: id }, data: { step: 5, deliveredAt } }),
      ]);
      return NextResponse.json({ ok: true, status: "delivered", deliveredAt: deliveredAt.toISOString() });
    }

    if (action === "return") {
      await prisma.$transaction([
        prisma.keepzipCase.update({ where: { id }, data: { status: "returned" } }),
        prisma.postalTracking.update({ where: { caseId: id }, data: { step: 4 } }),
      ]);
      return NextResponse.json({ ok: true, status: "returned" });
    }

    // 발송 후 단순 상태 전이(resolve/unrespond/payment_order/litigation/public_notice)
    const to = SIMPLE_TO[action];
    await prisma.keepzipCase.update({ where: { id }, data: { status: to } });
    return NextResponse.json({ ok: true, status: to });
  } catch (e) {
    console.error("[POST /api/keepzip/cases/[id]/demo-advance]", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
