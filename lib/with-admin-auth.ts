import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface AdminSession {
  user: { id: string; role: string; email?: string | null; name?: string | null };
}

type AuthenticatedHandler<P = Record<string, never>> = (
  request: NextRequest,
  context: { session: AdminSession; params: P }
) => Promise<NextResponse>;

/**
 * Admin API 인증 래퍼
 * - 세션 체크 + ADMIN 역할 검증을 자동 수행
 * - 인증 실패 시 403 반환
 * - 동적 라우트 params 전달 지원
 */
export function withAdminAuth<P = Record<string, never>>(handler: AuthenticatedHandler<P>) {
  return async (request: NextRequest, routeContext?: { params: Promise<P> }) => {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
    }
    const params = routeContext?.params ? await routeContext.params : {} as P;
    return handler(request, { session: session as AdminSession, params });
  };
}
