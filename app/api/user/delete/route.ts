import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditWithRequest } from "@/lib/audit-log";
import { validateOrigin } from "@/lib/csrf";

/**
 * 회원 탈퇴 — 본인 계정 삭제.
 * Account/Session 등 onDelete: Cascade 관계는 자동 삭제된다.
 */
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    await logAuditWithRequest({
      userId,
      action: "ACCOUNT_DELETE",
      detail: { email: session.user.email, status: "requested" },
    });

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "회원 탈퇴가 완료되었습니다." });
  } catch (e) {
    console.error("[user/delete] 탈퇴 실패:", e);
    return NextResponse.json(
      { error: "탈퇴 처리 중 오류가 발생했습니다. 등록한 매물·계약 등 데이터가 있으면 먼저 정리해 주세요." },
      { status: 500 }
    );
  }
}
