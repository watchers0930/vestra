import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditWithRequest } from "@/lib/audit-log";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    return await setupRole(req);
  } catch {
    // DB/인증 예외의 원문에는 개인정보가 포함될 수 있으므로 기록하거나 반환하지 않는다.
    return NextResponse.json({ error: "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
  }
}

async function setupRole(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "유효하지 않은 요청입니다" }, { status: 400 });
  }
  const { role, businessNumber, companyName, representName, userType } = body as Record<string, unknown>;

  // 유효한 역할만 허용 (RENTAL_BIZ=임대사업자는 BUSINESS/REALESTATE와 동일한 사업자 승인 흐름)
  if (typeof role !== "string" || !["PERSONAL", "RENTAL_BIZ", "BUSINESS", "REALESTATE"].includes(role)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다" }, { status: 400 });
  }

  // 사업자 역할 라벨
  const bizLabel = role === "REALESTATE" ? "중개사" : role === "RENTAL_BIZ" ? "임대사업자" : "기업";

  // PERSONAL: 즉시 역할 전환, business info 불필요
  if (role === "PERSONAL") {
    const validUserType = userType === "TENANT" || userType === "LANDLORD" ? userType : null;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "PERSONAL", ...(validUserType ? { userType: validUserType } : {}) },
    });

    await logAuditWithRequest({
      userId: session.user.id,
      action: "ROLE_CHANGE",
      detail: { newRole: "PERSONAL", userType: validUserType, status: "applied" },
    });

    return NextResponse.json({ message: "개인 회원으로 전환되었습니다." });
  }

  // REALESTATE/BUSINESS: business info 필요 여부 확인
  // 저장 정보 재사용은 세 필드가 모두 생략된 요청에만 허용한다.
  const hasBusinessInfo = ["businessNumber", "companyName", "representName"].some(key => Object.hasOwn(body, key));

  if (!hasBusinessInfo) {
    // business info가 요청에 없으면 DB에 이미 있는지 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyName: true, role: true },
    });

    if (user?.companyName) {
      // [보안] 사업자 역할은 관리자 승인 전까지 부여하지 않는다.
      // role은 그대로 두고(PERSONAL 유지) 요청 역할만 requestedRole에 기록 →
      // 승인 전 권한 상승·화면 오전환을 원천 차단한다. (승인 시 admin/verify가 role 부여)
      await prisma.user.update({
        where: { id: session.user.id },
        data: { requestedRole: role, verifyStatus: "pending" },
      });

      await logAuditWithRequest({
        userId: session.user.id,
        action: "ROLE_CHANGE",
        detail: { requestedRole: role, status: "pending" },
      });

      return NextResponse.json({ message: `${bizLabel} 회원으로 전환 신청되었습니다. 관리자 승인 후 전체 기능이 활성화됩니다.` });
    }

    // business info가 없으면 폼 입력 필요
    return NextResponse.json({ needsBusinessInfo: true }, { status: 422 });
  }

  // business info 검증
  if (typeof businessNumber !== "string" || !/^(?:\d{10}|\d{3}-\d{2}-\d{5})$/.test(businessNumber.trim())) {
    return NextResponse.json({ error: "사업자등록번호 형식이 올바르지 않습니다" }, { status: 400 });
  }
  if (typeof companyName !== "string" || companyName.trim().length < 2 || companyName.trim().length > 50) {
    return NextResponse.json({ error: "회사명을 입력해주세요 (2~50자)" }, { status: 400 });
  }
  if (typeof representName !== "string" || representName.trim().length < 2 || representName.trim().length > 20) {
    return NextResponse.json({ error: "대표자명을 입력해주세요 (2~20자)" }, { status: 400 });
  }

  // business info 저장 + 승인 대기(요청 역할만 기록, role은 승인 시 부여)
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      requestedRole: role,
      businessNumber: businessNumber.trim(),
      companyName: companyName.trim(),
      representName: representName.trim(),
      verifyStatus: "pending",
    },
  });

  await logAuditWithRequest({
    userId: session.user.id,
    action: "ROLE_CHANGE",
    detail: { requestedRole: role, status: "pending" },
  });

  return NextResponse.json({ message: "등록이 완료되었습니다. 관리자 승인 후 전체 기능이 활성화됩니다." });
}
