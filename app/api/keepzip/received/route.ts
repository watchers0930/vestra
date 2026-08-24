import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CAUSE_LABEL: Record<string, string> = {
  deposit_return: "보증금 반환청구",
  terminate_by_tenant: "부동산 계약해지(세입자용)",
  terminate_by_landlord: "부동산 계약해지(임대인용)",
  rent_arrears: "월세 청구",
  maintenance_arrears: "체납 관리비 납부 요청",
};

/**
 * GET /api/keepzip/received — 로그인 사용자가 수신인(임대인)인 내용증명 목록(갭6)
 * 계약 연결로 recipientUserId가 설정된 건만 조회된다. 발송 단계(발신 후)만 노출.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rows = await prisma.keepzipCase.findMany({
    where: {
      recipientUserId: userId,
      status: { in: ["lawyer_approved", "postal_sent", "delivered"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, cause: true, senderName: true, address: true, deposit: true,
      status: true, sentAt: true, createdAt: true,
    },
  });

  const received = rows.map((r) => ({
    id: r.id,
    cause: r.cause,
    causeLabel: CAUSE_LABEL[r.cause] ?? r.cause,
    senderName: r.senderName,
    address: r.address,
    deposit: r.deposit != null ? Number(r.deposit) : null, // BigInt → number 직렬화(보증금은 안전정수 범위)
    status: r.status,
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ received });
}
