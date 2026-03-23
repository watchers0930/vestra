import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [today, week, total, alertCount, lastArticle, weeklyUsage] = await Promise.all([
    prisma.newsArticle.count({ where: { collectedAt: { gte: todayStart } } }),
    prisma.newsArticle.count({ where: { collectedAt: { gte: weekStart } } }),
    prisma.newsArticle.count(),
    prisma.newsArticle.count({ where: { isAlert: true, alertAcked: false } }),
    prisma.newsArticle.findFirst({ orderBy: { collectedAt: "desc" }, select: { collectedAt: true } }),
    prisma.newsUsageLog.groupBy({
      by: ["usedIn"],
      where: { usedAt: { gte: weekStart } },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    today,
    week,
    total,
    alertCount,
    lastCollected: lastArticle?.collectedAt || null,
    weeklyUsage: weeklyUsage.map((u) => ({ usedIn: u.usedIn, count: u._count })),
  });
}
