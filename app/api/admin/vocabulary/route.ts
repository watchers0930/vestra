import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: 용어 목록 조회 (카테고리 필터, 검색, 통계) */
export const GET = withAdminAuth(async (req) => {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (category && category !== "all") where.category = category;
  if (search) where.term = { contains: search };

  const [items, total] = await Promise.all([
    prisma.domainVocabulary.findMany({
      where,
      orderBy: [{ category: "asc" }, { frequency: "desc" }],
      skip,
      take: limit,
    }),
    prisma.domainVocabulary.count({ where }),
  ]);

  const [registryRight, legalAction, structure, financeTax, totalCount] =
    await Promise.all([
      prisma.domainVocabulary.count({ where: { category: "registry_right" } }),
      prisma.domainVocabulary.count({ where: { category: "legal_action" } }),
      prisma.domainVocabulary.count({ where: { category: "structure" } }),
      prisma.domainVocabulary.count({ where: { category: "finance_tax" } }),
      prisma.domainVocabulary.count(),
    ]);

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      total: totalCount,
      registry_right: registryRight,
      legal_action: legalAction,
      structure: structure,
      finance_tax: financeTax,
    },
  });
});

/** POST: 수동 용어 추가 */
export const POST = withAdminAuth(async (req, { session }) => {
  const body = await req.json();
  const { term, category, definition } = body;

  if (!term?.trim() || !category) {
    return NextResponse.json({ error: "용어와 카테고리는 필수입니다." }, { status: 400 });
  }

  const validCategories = ["registry_right", "legal_action", "structure", "finance_tax"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "유효하지 않은 카테고리입니다." }, { status: 400 });
  }

  const vocab = await prisma.domainVocabulary.upsert({
    where: { term: term.trim() },
    update: { category, definition, frequency: { increment: 1 } },
    create: {
      term: term.trim(),
      category,
      source: "manual",
      definition: definition || null,
    },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:create-vocabulary",
    target: `vocabulary:${vocab.id}`,
    detail: { term: term.trim(), category, description: "도메인 용어 추가" },
  });

  return NextResponse.json(vocab);
});
