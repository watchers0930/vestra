import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/with-admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/new-members?since=ISO타임스탬프
 * since 이후 가입한 신규 회원 수 반환 (관리자 전용)
 */
export const GET = withAdminAuth(async (req) => {
  const since = req.nextUrl.searchParams.get("since");

  if (!since) {
    return NextResponse.json({ count: 0 });
  }

  const parsed = new Date(since);
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "유효하지 않은 날짜 형식입니다" }, { status: 400 });
  }

  try {
    const count = await prisma.user.count({
      where: { createdAt: { gt: parsed } },
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("신규 회원 수 조회 오류:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});
