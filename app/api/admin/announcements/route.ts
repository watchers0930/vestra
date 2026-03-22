import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: 공지사항 목록 */
export const GET = withAdminAuth(async () => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(announcements);
});

/** POST: 새 공지사항 작성 */
export const POST = withAdminAuth(async (req, { session }) => {
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
});
