import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const GET = withAdminAuth(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    roleBreakdown,
    pendingVerifications,
    todayAnalyses,
    totalAnalyses,
    totalAssets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.user.count({ where: { verifyStatus: "pending" } }),
    prisma.analysis.count({ where: { createdAt: { gte: today } } }),
    prisma.analysis.count(),
    prisma.asset.count(),
  ]);

  const roles: Record<string, number> = {};
  for (const r of roleBreakdown) {
    roles[r.role] = r._count.role;
  }

  // --- 일일 분석 추이 (최근 7일) ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentAnalyses = await prisma.analysis.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });

  const trendMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of recentAnalyses) {
    const dateKey = r.createdAt.toISOString().slice(0, 10);
    if (trendMap[dateKey] !== undefined) {
      trendMap[dateKey] += 1;
    }
  }
  const dailyTrend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totalUsers,
    roles,
    pendingVerifications,
    todayAnalyses,
    totalAnalyses,
    totalAssets,
    dailyTrend,
  });
});
