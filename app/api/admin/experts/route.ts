import { NextResponse } from "next/server";
import { ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/**
 * 관리자: 전문가(변호사·법무사 등) 가입 신청 관리
 *
 * 전문가 가입은 LawyerPartner(kycStatus="pending")를 생성하지만
 * User.role은 승격되지 않는다. 관리자가 이 API로 승인해야
 * User.role="LAWYER"로 승격되어 /lawyer/dashboard에 진입할 수 있다.
 */

/** 관리자: 심사 대기 중인 전문가 신청 목록 */
export const GET = withAdminAuth(async () => {
  const pending = await prisma.lawyerPartner.findMany({
    where: { kycStatus: "pending" },
    select: {
      id: true,
      userId: true,
      category: true,
      name: true,
      phone: true,
      firmName: true,
      bizNo: true,
      licenseNo: true,
      homepageSlug: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // LawyerPartner↔User는 relation 필드가 없어 userId로 별도 일괄 조회(in 쿼리 1회, N+1 아님)
  const userMap = new Map<string, { email: string | null; name: string | null; image: string | null; role: string }>();
  if (pending.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: pending.map((p) => p.userId) } },
      select: { id: true, email: true, name: true, image: true, role: true },
    });
    for (const u of users) userMap.set(u.id, { email: u.email, name: u.name, image: u.image, role: u.role });
  }

  const result = pending.map((p) => ({ ...p, user: userMap.get(p.userId) ?? null }));
  return NextResponse.json(result);
});

/** 관리자: 전문가 승인/거부 */
export const POST = withAdminAuth(async (req, { session }) => {
  const body = await req.json().catch(() => null);
  const partnerId = typeof body?.partnerId === "string" ? body.partnerId : "";
  const action = body?.action;

  if (!partnerId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "유효하지 않은 요청" }, { status: 400 });
  }

  const partner = await prisma.lawyerPartner.findUnique({
    where: { id: partnerId },
    select: { id: true, userId: true, kycStatus: true, category: true },
  });

  if (!partner || partner.kycStatus !== "pending") {
    return NextResponse.json({ error: "대기 중인 전문가 신청이 없습니다" }, { status: 404 });
  }

  if (action === "approve") {
    // 승인: 전문가 인증 완료 + 계정을 LAWYER로 승격 + 미니홈페이지 활성화
    await prisma.$transaction([
      prisma.lawyerPartner.update({
        where: { id: partner.id },
        data: { kycStatus: "verified", homepageActive: true },
      }),
      prisma.user.update({
        where: { id: partner.userId },
        data: { role: "LAWYER", dailyLimit: ROLE_LIMITS.LAWYER },
      }),
    ]);

    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:approve-expert",
      target: `user:${partner.userId}`,
      detail: { partnerId: partner.id, category: partner.category, description: "전문가 인증 승인 → LAWYER 승격" },
    });

    return NextResponse.json({ message: "승인 완료", role: "LAWYER" });
  }

  // 거부: 전문가 신청만 반려 (계정 역할은 변경하지 않음)
  await prisma.lawyerPartner.update({
    where: { id: partner.id },
    data: { kycStatus: "rejected" },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:reject-expert",
    target: `user:${partner.userId}`,
    detail: { partnerId: partner.id, description: "전문가 인증 거부" },
  });

  return NextResponse.json({ message: "전문가 신청이 거부되었습니다" });
});
