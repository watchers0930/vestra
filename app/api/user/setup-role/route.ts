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

  const { role, businessNumber, companyName, representName } = await req.json();

  // 유효한 역할만 허용
  if (!["PERSONAL", "BUSINESS", "REALESTATE"].includes(role)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다" }, { status: 400 });
  }

  // PERSONAL: 즉시 역할 전환, business info 불필요
  if (role === "PERSONAL") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "PERSONAL" },
    });

    await logAuditWithRequest({
      userId: session.user.id,
      action: "ROLE_CHANGE",
      detail: { newRole: "PERSONAL", status: "applied" },
    });

    return NextResponse.json({ message: "개인 회원으로 전환되었습니다." });
  }

  // REALESTATE/BUSINESS: business info 필요 여부 확인
  const hasBusinessInfo = !!businessNumber && !!companyName && !!representName;

  if (!hasBusinessInfo) {
    // business info가 요청에 없으면 DB에 이미 있는지 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyName: true, role: true },
    });

    if (user?.companyName) {
      // 이미 business info가 있으면 역할만 전환
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role },
      });

      await logAuditWithRequest({
        userId: session.user.id,
        action: "ROLE_CHANGE",
        detail: { newRole: role, status: "applied" },
      });

      return NextResponse.json({ message: `${role === "REALESTATE" ? "중개사" : "기업"} 회원으로 전환되었습니다.` });
    }

    // business info가 없으면 폼 입력 필요
    return NextResponse.json({ needsBusinessInfo: true }, { status: 422 });
  }

  // business info 검증
  if (typeof businessNumber !== "string" || businessNumber.trim().length < 10) {
    return NextResponse.json({ error: "사업자등록번호를 입력해주세요" }, { status: 400 });
  }
  if (typeof companyName !== "string" || companyName.trim().length < 2 || companyName.trim().length > 50) {
    return NextResponse.json({ error: "회사명을 입력해주세요 (2~50자)" }, { status: 400 });
  }
  if (typeof representName !== "string" || representName.trim().length < 2 || representName.trim().length > 20) {
    return NextResponse.json({ error: "대표자명을 입력해주세요 (2~20자)" }, { status: 400 });
  }

  // business info 저장 + 역할 전환
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role,
      businessNumber: businessNumber.trim(),
      companyName: companyName.trim(),
      representName: representName.trim(),
      verifyStatus: "pending",
    },
  });

  await logAuditWithRequest({
    userId: session.user.id,
    action: "ROLE_CHANGE",
    detail: { requestedRole: role, companyName: companyName.trim(), representName: representName.trim(), status: "pending" },
  });

  return NextResponse.json({ message: "등록이 완료되었습니다. 관리자 승인 후 전체 기능이 활성화됩니다." });
}
