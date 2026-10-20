import { NextResponse } from "next/server";
import { ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** 관리자: 대기 중인 사업자 인증 목록 조회 */
export const GET = withAdminAuth(async () => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { verifyStatus: "pending" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        requestedRole: true,
        businessNumber: true,
        companyName: true,
        representName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pendingUsers);
  } catch {
    return unavailable();
  }
});

/** 관리자: 인증 승인/거부 */
export const POST = withAdminAuth(async (req, { session }) => {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "유효하지 않은 요청" }, { status: 400 });
  }
  const { userId, action, role } = body as Record<string, unknown>;

  if (typeof userId !== "string" || !userId.trim() || typeof action !== "string" || !["approve", "reject"].includes(action) ||
      (role !== undefined && (typeof role !== "string" || !["RENTAL_BIZ", "BUSINESS", "REALESTATE"].includes(role)))) {
    return NextResponse.json({ error: "유효하지 않은 요청" }, { status: 400 });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { verifyStatus: true, requestedRole: true },
    });

    if (!targetUser || targetUser.verifyStatus !== "pending") {
      return NextResponse.json({ error: "대기 중인 인증 신청이 없습니다" }, { status: 404 });
    }

    if (action === "approve") {
      // 승인 역할 우선순위: 관리자가 지정한 role > 사용자가 신청한 requestedRole > 기본 BUSINESS
      const approvedRole = role || targetUser.requestedRole || "BUSINESS";
      if (!["RENTAL_BIZ", "BUSINESS", "REALESTATE"].includes(approvedRole)) {
        return NextResponse.json({ error: "유효하지 않은 역할입니다" }, { status: 400 });
      }
      const dailyLimit = ROLE_LIMITS[approvedRole] || ROLE_LIMITS.BUSINESS;

      await prisma.user.update({
        where: { id: userId },
        data: { role: approvedRole, verifyStatus: "verified", dailyLimit, requestedRole: null },
      });

      createAuditLog({
        req,
        userId: session.user.id,
        action: "admin:approve-verification",
        target: `user:${userId}`,
        detail: { approvedRole, dailyLimit, description: "사업자 인증 승인" },
      });

      return NextResponse.json({ message: "승인 완료", role: approvedRole, dailyLimit });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { verifyStatus: "rejected", requestedRole: null },
    });

    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:reject-verification",
      target: `user:${userId}`,
      detail: { description: "사업자 인증 거부" },
    });

    return NextResponse.json({ message: "인증이 거부되었습니다" });
  } catch {
    return unavailable();
  }
});

function unavailable() {
  // Prisma 예외 원문은 입력값 등 개인정보를 포함할 수 있다.
  return NextResponse.json({ error: "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
}
