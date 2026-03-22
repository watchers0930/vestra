import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: 전체 분석 이력 조회 */
export const GET = withAdminAuth(async (req) => {
  const { searchParams } = req.nextUrl;
  const typeFilter = searchParams.get("type");

  const where = typeFilter ? { type: typeFilter } : {};

  const analyses = await prisma.analysis.findMany({
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
    take: 200,
  });

  return NextResponse.json(analyses);
});
