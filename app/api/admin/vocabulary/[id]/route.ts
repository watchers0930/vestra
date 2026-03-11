import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PUT: 용어 수정 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
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

  return NextResponse.json(updated);
}

/** DELETE: 용어 삭제 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.domainVocabulary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "용어를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.domainVocabulary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
