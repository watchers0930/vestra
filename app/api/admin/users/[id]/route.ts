import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH: 사용자 역할/일일한도 변경 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.role && Object.keys(ROLE_LIMITS).includes(body.role)) {
    data.role = body.role;
    data.dailyLimit = ROLE_LIMITS[body.role];
  }

  if (typeof body.dailyLimit === "number" && body.dailyLimit > 0) {
    data.dailyLimit = body.dailyLimit;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, role: true, dailyLimit: true },
  });

  return NextResponse.json(updated);
}

/** DELETE: 사용자 삭제 (Cascade) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "사용자가 삭제되었습니다" });
}
