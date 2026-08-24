import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { sanitizeField } from "@/lib/sanitize";
import { sendNotification } from "@/lib/notification-sender";

type Params = { params: Promise<{ id: string }> };

// GET /api/e-contracts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const contract = await prisma.eContract.findUnique({
      where: { id },
      include: { signatures: true },
    });
    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
    }

    const userEmail = session.user.email?.toLowerCase() ?? "";
    const isParty =
      contract.landlordId === session.user.id ||
      contract.tenantEmail === userEmail ||
      contract.brokerEmail === userEmail;

    if (!isParty) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({ contract });
  } catch (e) {
    console.error("[GET /api/e-contracts/[id]]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/e-contracts/[id] — 계약 취소
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const cancelReason = typeof body?.reason === "string" ? sanitizeField(body.reason, 500) : null;

    const contract = await prisma.eContract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (contract.landlordId !== session.user.id && contract.creatorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (action === "cancel") {
      // 가계약서는 생성 즉시 COMPLETED이므로 완료 계약의 파기(취소)를 허용한다(갭7).
      if (contract.status === "CANCELED") {
        return NextResponse.json({ error: "이미 취소된 계약입니다." }, { status: 400 });
      }
      // 매물에 다른 유효 계약(완료/임차인서명대기)이 남아있으면 ACTIVE 복구 금지(H2: 이중계약 방지)
      let restoreListing = false;
      if (contract.listingId) {
        const otherActive = await prisma.eContract.count({
          where: { listingId: contract.listingId, id: { not: id }, status: { not: "CANCELED" } },
        });
        restoreListing = otherActive === 0;
      }
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        // 취소 + 감사 기록(누가/언제/사유) — 권고3
        await tx.eContract.update({
          where: { id },
          data: { status: "CANCELED", canceledAt: now, canceledBy: session.user!.id, cancelReason },
        });
        // 임차인 독립서명 대기 토큰 무효화(H1: 취소 후 서명으로 계약 부활 차단)
        await tx.eContractSignature.updateMany({
          where: { contractId: id, signToken: { not: null } },
          data: { signToken: null, signTokenExpires: null },
        });
        if (restoreListing && contract.listingId) {
          await tx.listing.update({ where: { id: contract.listingId }, data: { status: "ACTIVE" } });
        }
      });

      // 상대방(임차인 가입회원) 통지 — 권고3. 취소 실행자가 아닌 임차인에게만.
      if (contract.tenantId && contract.tenantId !== session.user.id) {
        await sendNotification({
          userId: contract.tenantId,
          type: "system",
          title: "가계약이 취소되었습니다",
          body: `${contract.address} 가계약이 취소되었습니다.${cancelReason ? ` 사유: ${cancelReason}` : ""}`,
          data: { econtractId: id, kind: "contract_canceled" },
        }).catch((e) => console.error("[e-contracts cancel] 통지 실패", e));
      }

      return NextResponse.json({ success: true, listingRestored: restoreListing });
    }

    return NextResponse.json({ error: "유효하지 않은 action입니다." }, { status: 400 });
  } catch (e) {
    console.error("[PATCH /api/e-contracts/[id]]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
