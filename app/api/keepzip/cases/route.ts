import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";

const CAUSES = ["deposit_return", "terminate_by_tenant", "terminate_by_landlord", "rent_arrears", "maintenance_arrears"];

/**
 * POST /api/keepzip/cases — 결제 후 사건 생성(변호사 전송). 설계서 §6·§9 (status: lawyer_pending)
 * GET  /api/keepzip/cases — 내 사건 목록 (또는 ?lawyerId= 로 변호사 배정 사건)
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const rl = await rateLimit(`keepzip-cases:${userId}`, 20);
    if (!rl.success) return NextResponse.json({ error: "요청 한도 초과." }, { status: 429, headers: rateLimitHeaders(rl) });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const cause = String(b.cause ?? "");
    if (!CAUSES.includes(cause)) return NextResponse.json({ error: "내용증명 종류 오류." }, { status: 400 });

    const lawyerId = sanitizeField(String(b.lawyerId ?? ""), 50);
    const senderName = sanitizeField(String(b.senderName ?? ""), 100);
    const recipientName = sanitizeField(String(b.recipientName ?? ""), 100);
    const address = sanitizeField(String(b.address ?? ""), 400);
    if (!lawyerId) return NextResponse.json({ error: "담당 변호사가 지정되지 않았습니다." }, { status: 400 });
    if (!senderName || !recipientName || !address) return NextResponse.json({ error: "필수 정보가 누락됐습니다." }, { status: 400 });

    const senderSide = b.senderSide === "landlord" ? "landlord" : "tenant";
    const deposit = Number.isFinite(Number(b.deposit)) && Number(b.deposit) >= 0 ? Math.floor(Number(b.deposit)) : null;
    const draftContent = typeof b.draftContent === "string" ? b.draftContent.slice(0, 20000) : null;
    const signatureUrl = typeof b.signatureUrl === "string" && b.signatureUrl.startsWith("data:image/") ? b.signatureUrl : null;

    // 근거 전자계약 연결(갭1) — 본인이 임차인으로 참여한 계약만 연결 허용
    // + 계약 연결 시 임대인을 수신인 User로 자동 설정(갭6, 플랫폼 수신함용)
    let econtractId: string | null = null;
    let recipientUserId: string | null = null;
    const reqEcontractId = sanitizeField(String(b.econtractId ?? ""), 50);
    if (reqEcontractId) {
      const email = session?.user?.email?.toLowerCase() ?? "";
      const owned = await prisma.eContract.findFirst({
        where: { id: reqEcontractId, OR: [{ tenantId: userId }, { tenantEmail: email }] },
        select: { id: true, landlordId: true },
      });
      if (owned) {
        econtractId = owned.id;
        recipientUserId = owned.landlordId; // 계약 임대인 = 반환청구 수신인
      }
    }

    const created = await prisma.keepzipCase.create({
      data: {
        userId, lawyerId, cause, senderSide, senderName, recipientName, address,
        deposit, draftContent, signatureUrl, econtractId, recipientUserId,
        serviceFee: 9900, postalFee: 0, totalPaid: 9900,
        status: "lawyer_pending", settlementStatus: "hold",
      },
    });

    return NextResponse.json({ ok: true, id: created.id, status: created.status });
  } catch (e) {
    console.error("[POST /api/keepzip/cases]", e);
    return NextResponse.json({ error: "사건 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // as=lawyer → 로그인 변호사(LawyerPartner)에게 배정된 사건, 기본 → 내가 신청한 사건
    const asLawyer = req.nextUrl.searchParams.get("as") === "lawyer";
    let where: { lawyerId: string } | { userId: string };
    if (asLawyer) {
      const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
      if (!partner) return NextResponse.json({ cases: [] });
      where = { lawyerId: partner.id };
    } else {
      where = { userId };
    }
    const cases = await prisma.keepzipCase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, cause: true, senderName: true, recipientName: true,
        status: true, createdAt: true, lawyerId: true,
      },
      take: 50,
    });
    return NextResponse.json({ cases });
  } catch (e) {
    console.error("[GET /api/keepzip/cases]", e);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
