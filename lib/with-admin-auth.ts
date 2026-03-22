import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: { user: { id: string; role: string; email?: string | null; name?: string | null } } }
) => Promise<NextResponse>;

/**
 * Admin API 인증 래퍼
 * - 세션 체크 + ADMIN 역할 검증을 자동 수행
 * - 인증 실패 시 403 반환
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
    }
    return handler(request, { session: session as { user: { id: string; role: string; email?: string | null; name?: string | null } } });
  };
}
