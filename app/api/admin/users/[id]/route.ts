import { NextResponse } from "next/server";
import { ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditWithRequest, createAuditLog, recordPiiAccess } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: 사용자 상세 (기본정보 + 활동 카운트 + 구독 + 최근 분석 이력) */
export const GET = withAdminAuth<{ id: string }>(async (request, { session, params }) => {
  const { id } = params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      requestedRole: true,
      userType: true,
      businessNumber: true, // PII — Prisma 확장이 최상위 select 자동 복호화
      companyName: true,
      representName: true,
      verifyStatus: true,
      dailyLimit: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: { plan: true, status: true, price: true, startDate: true, endDate: true, canceledAt: true },
      },
      // 관계 카운트는 _count로 집계 (N+1·대량 로드 방지)
      _count: {
        select: { analyses: true, assets: true, monitoredProperties: true, ownedListings: true },
      },
      // 최근 분석 이력만 제한 조회 (전체 로드 금지)
      analyses: {
        select: { id: true, type: true, typeLabel: true, address: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다" }, { status: 404 });
  }

  // 사업자번호(PII) 노출을 포함하므로 접근 감사 기록
  recordPiiAccess({
    req: request,
    userId: session.user.id,
    resource: "admin_user_detail",
    targetId: id,
    recordCount: 1,
  });

  return NextResponse.json({ user });
});

/** PATCH: 사용자 역할/일일한도 변경 */
export const PATCH = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.role && Object.keys(ROLE_LIMITS).includes(body.role)) {
    data.role = body.role;
    data.dailyLimit = ROLE_LIMITS[body.role];
  }

  if (typeof body.dailyLimit === "number" && body.dailyLimit > 0) {
    data.dailyLimit = body.dailyLimit;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, role: true, dailyLimit: true },
  });

  await logAuditWithRequest({
    userId: session.user.id,
    action: "ADMIN_USER_UPDATE",
    target: id,
    detail: { changes: data, result: updated },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:update-user",
    target: `user:${id}`,
    detail: { changes: data, description: "사용자 역할/한도 변경" },
  });

  return NextResponse.json(updated);
});

/** DELETE: 사용자 삭제 (Cascade) */
export const DELETE = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  await logAuditWithRequest({
    userId: session.user.id,
    action: "ADMIN_USER_DELETE",
    target: id,
    detail: { deletedUserId: id },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:delete-user",
    target: `user:${id}`,
    detail: { description: "사용자 삭제" },
  });

  return NextResponse.json({ message: "사용자가 삭제되었습니다" });
});
