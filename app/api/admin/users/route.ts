import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";
import { recordPiiAccess } from "@/lib/audit-log";

export const GET = withAdminAuth(async (request, { session }) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;
  const role = searchParams.get("role"); // 특정 역할 필터 (없거나 ALL이면 전체)
  const where = role && role !== "ALL" ? { role } : {};

  const [users, total, grouped] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        verifyStatus: true,
        dailyLimit: true,
        businessNumber: true,
        companyName: true,
        representName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.user.count({ where }),
    // 역할별 전체 카운트 (필터 배지용 — 현재 페이지가 아닌 전체 기준)
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const roleCounts: Record<string, number> = {};
  let allCount = 0;
  for (const g of grouped) {
    roleCounts[g.role] = g._count._all;
    allCount += g._count._all;
  }
  roleCounts.ALL = allCount;

  recordPiiAccess({
    req: request,
    userId: session.user.id,
    resource: "admin_user_list",
    targetId: role || "ALL",
    recordCount: users.length,
  });

  return NextResponse.json({ users, total, page, limit, totalPages: Math.ceil(total / limit), roleCounts });
});
