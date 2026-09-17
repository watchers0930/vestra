import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET — 공개 공지사항 목록 (최신순)
 * 공지는 공개 정보이므로 인증 없이 제공한다. 푸터·공지 영역에서 최신 N개 표시용.
 * content는 목록에 불필요하므로 제외(id·title·createdAt만).
 */
export async function GET(request: NextRequest) {
  const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 5));

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json({ announcements });
}
