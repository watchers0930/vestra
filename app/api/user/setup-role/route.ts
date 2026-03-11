import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditWithRequest } from "@/lib/audit-log";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { role, businessNumber } = await req.json();

  // 유효한 업그레이드 역할만 허용
  if (!["BUSINESS", "REALESTATE"].includes(role)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다" }, { status: 400 });
  }

  // 사업자등록번호 필수
  if (!businessNumber || typeof businessNumber !== "string" || businessNumber.trim().length < 10) {
    return NextResponse.json({ error: "사업자등록번호를 입력해주세요" }, { status: 400 });
  }

  // 현재 사용자 상태 확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { verifyStatus: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  if (user.verifyStatus === "pending") {
    return NextResponse.json({ error: "이미 인증 신청이 진행 중입니다" }, { status: 409 });
  }

  if (user.role === "BUSINESS" || user.role === "REALESTATE" || user.role === "ADMIN") {
    return NextResponse.json({ error: "이미 상위 등급입니다" }, { status: 409 });
  }

  // 인증 신청: pending 상태로 변경 (관리자 승인 대기)
  // PII 암호화는 Prisma 미들웨어가 자동 처리
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      businessNumber: businessNumber.trim(),
      verifyStatus: "pending",
    },
  });

  // 감사 로그: 역할 변경 신청
  await logAuditWithRequest({
    userId: session.user.id,
    action: "ROLE_CHANGE",
    detail: { requestedRole: role, status: "pending" },
  });

  return NextResponse.json({ message: "인증 신청이 접수되었습니다. 관리자 승인 후 반영됩니다." });
}
