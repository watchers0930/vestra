import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const alerts = await prisma.newsArticle.findMany({
    where: { isAlert: true, alertAcked: false },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ alerts });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.newsArticle.update({
    where: { id },
    data: { alertAcked: true },
  });

  return NextResponse.json({ success: true });
}
