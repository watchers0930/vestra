import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const [
    totalUsers,
    roleBreakdown,
    pendingVerifications,
    todayUsageRecords,
    totalAnalyses,
    totalAssets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.user.count({ where: { verifyStatus: "pending" } }),
    prisma.dailyUsage.findMany({
      where: { id: { startsWith: `daily:` }, date: todayStr },
      select: { count: true },
    }),
    prisma.analysis.count(),
    prisma.asset.count(),
  ]);

  const todayAnalyses = todayUsageRecords.reduce((sum, r) => sum + r.count, 0);

  const roles: Record<string, number> = {};
  for (const r of roleBreakdown) {
    roles[r.role] = r._count.role;
  }

  return NextResponse.json({
    totalUsers,
    roles,
    pendingVerifications,
    todayAnalyses,
    totalAnalyses,
    totalAssets,
  });
}
