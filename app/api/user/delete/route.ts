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

    const email = session.user.email;
    // 탈퇴이력 기록(재가입 30일 차단용) + 계정·관련 데이터 몽땅 삭제(Cascade)
    await prisma.$transaction([
      ...(email
        ? [prisma.withdrawnEmail.upsert({
            where: { email },
            create: { email },
            update: { withdrawnAt: new Date() },
          })]
        : []),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ message: "회원 탈퇴가 완료되었습니다. 모든 정보가 삭제되었습니다." });
  } catch (e) {
    console.error("[user/delete] 탈퇴 실패:", e);
    return NextResponse.json(
      { error: "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
