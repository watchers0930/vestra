import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** PUT: 용어 수정 */
export const PUT = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const body = await req.json();
  const { category, definition } = body;

  const existing = await prisma.domainVocabulary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "용어를 찾을 수 없습니다." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (category) updateData.category = category;
  if (definition !== undefined) updateData.definition = definition;

  const updated = await prisma.domainVocabulary.update({
    where: { id },
    data: updateData,
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:update-vocabulary",
    target: `vocabulary:${id}`,
    detail: { category, description: "도메인 용어 수정" },
  });

  return NextResponse.json(updated);
});

/** DELETE: 용어 삭제 */
export const DELETE = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const existing = await prisma.domainVocabulary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "용어를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.domainVocabulary.delete({ where: { id } });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:delete-vocabulary",
    target: `vocabulary:${id}`,
    detail: { term: existing.term, description: "도메인 용어 삭제" },
  });

  return NextResponse.json({ success: true });
});
