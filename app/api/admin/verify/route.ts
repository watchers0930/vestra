import { NextResponse } from "next/server";
import { ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** 관리자: 대기 중인 사업자 인증 목록 조회 */
export const GET = withAdminAuth(async () => {
  const pendingUsers = await prisma.user.findMany({
    where: { verifyStatus: "pending" },
    select: {
      id: true,
      name: true,
      email: true,
      businessNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pendingUsers);
});

/** 관리자: 인증 승인/거부 */
export const POST = withAdminAuth(async (req, { session }) => {
  const { userId, action, role } = await req.json();

  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "유효하지 않은 요청" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifyStatus: true },
  });

  if (!targetUser || targetUser.verifyStatus !== "pending") {
    return NextResponse.json({ error: "대기 중인 인증 신청이 없습니다" }, { status: 404 });
  }

  if (action === "approve") {
    const approvedRole = role || "BUSINESS";
    const dailyLimit = ROLE_LIMITS[approvedRole] || ROLE_LIMITS.BUSINESS;

    await prisma.user.update({
      where: { id: userId },
      data: { role: approvedRole, verifyStatus: "verified", dailyLimit },
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
    data: { verifyStatus: "rejected" },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:reject-verification",
    target: `user:${userId}`,
    detail: { description: "사업자 인증 거부" },
  });

  return NextResponse.json({ message: "인증이 거부되었습니다" });
});
