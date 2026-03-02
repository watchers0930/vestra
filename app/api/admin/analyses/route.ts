import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: 전체 분석 이력 조회 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
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
}
