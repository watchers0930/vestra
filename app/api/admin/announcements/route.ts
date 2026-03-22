import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

/** GET: 공지사항 목록 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

/** POST: 새 공지사항 작성 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { title, content } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: { title: title.trim(), content: content.trim() },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:create-announcement",
    target: `announcement:${announcement.id}`,
    detail: { title: title.trim(), description: "공지사항 생성" },
  });

  return NextResponse.json(announcement);
}
