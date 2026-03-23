import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const GET = withAdminAuth(async () => {
  const alerts = await prisma.newsArticle.findMany({
    where: { isAlert: true, alertAcked: false },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ alerts });
});

export const PATCH = withAdminAuth(async (req: NextRequest) => {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.newsArticle.update({
      where: { id },
      data: { alertAcked: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "알림 확인 실패" }, { status: 404 });
  }
});
