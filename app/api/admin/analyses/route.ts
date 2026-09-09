import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: 전체 분석 이력 조회 (서버 페이지네이션 + 유형 필터) */
export const GET = withAdminAuth(async (req) => {
  const { searchParams } = req.nextUrl;
  const typeFilter = searchParams.get("type");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;

  const where = typeFilter && typeFilter !== "ALL" ? { type: typeFilter } : {};

  const [analyses, total, grouped] = await Promise.all([
    prisma.analysis.findMany({
      where,
      select: {
        id: true,
        type: true,
        typeLabel: true,
        address: true,
        summary: true,
        createdAt: true,
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.analysis.count({ where }),
    // 유형별 전체 카운트 (필터 배지용)
    prisma.analysis.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  const typeCounts: Record<string, number> = {};
  let allCount = 0;
  for (const g of grouped) {
    typeCounts[g.type] = g._count._all;
    allCount += g._count._all;
  }
  typeCounts.ALL = allCount;

  return NextResponse.json({ analyses, total, page, limit, totalPages: Math.ceil(total / limit), typeCounts });
});
