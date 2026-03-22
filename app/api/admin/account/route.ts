import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";

export async function PUT(req: Request) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "필수 입력값 누락" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다" }, { status: 400 });
  }

  // 공공기관 보안 기준: 대문자+소문자+숫자+특수문자 중 3종 이상 조합
  const checks = [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/];
  const passed = checks.filter((re) => re.test(newPassword)).length;
  if (passed < 3) {
    return NextResponse.json(
      { error: "대문자, 소문자, 숫자, 특수문자 중 3종 이상 포함해야 합니다" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "비밀번호가 설정되지 않은 계정입니다" }, { status: 400 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:update-password",
    target: `user:${session.user.id}`,
    detail: { description: "관리자 비밀번호 변경" },
  });

  return NextResponse.json({ message: "비밀번호가 변경되었습니다" });
}
