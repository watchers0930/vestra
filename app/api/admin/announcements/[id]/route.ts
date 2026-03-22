import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** PUT: 공지사항 수정 */
export const PUT = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const { title, content } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: { title: title.trim(), content: content.trim() },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:update-announcement",
    target: `announcement:${id}`,
    detail: { title: title.trim(), description: "공지사항 수정" },
  });

  return NextResponse.json(updated);
});

/** DELETE: 공지사항 삭제 */
export const DELETE = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;

  await prisma.announcement.delete({ where: { id } });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:delete-announcement",
    target: `announcement:${id}`,
    detail: { description: "공지사항 삭제" },
  });

  return NextResponse.json({ message: "공지사항이 삭제되었습니다" });
});
