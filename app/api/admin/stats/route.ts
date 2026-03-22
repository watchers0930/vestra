import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const GET = withAdminAuth(async () => {
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

  // --- 일일 분석 추이 (최근 7일) ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const usageRecords = await prisma.dailyUsage.findMany({
    where: {
      id: { startsWith: "daily:" },
      date: { gte: sevenDaysAgo.toISOString().slice(0, 10) },
    },
  });

  const trendMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of usageRecords) {
    if (trendMap[r.date] !== undefined) {
      trendMap[r.date] += r.count;
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
