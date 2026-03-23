import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (tag) where.tags = { has: tag };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { usageLogs: true } },
      },
    }),
    prisma.newsArticle.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      usageCount: item._count.usageLogs,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export const DELETE = withAdminAuth(async (req: NextRequest) => {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.newsArticle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "삭제 실패" }, { status: 404 });
  }
});
