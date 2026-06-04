import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface AgentSession {
  user: {
    id: string;
    role: string;
    verifyStatus: string;
    email?: string | null;
    name?: string | null;
  };
}

type AuthenticatedHandler<P = Record<string, never>> = (
  request: NextRequest,
  context: { session: AgentSession; params: P }
) => Promise<NextResponse>;

/**
 * 부동산 중개사 API 인증 래퍼
 * - 세션 체크 + REALESTATE 역할 + verified 상태 검증
 * - 인증 실패 시 403 반환
 * - 동적 라우트 params 전달 지원
 */
export function withAgentAuth<P = Record<string, never>>(
  handler: AuthenticatedHandler<P>
) {
  return async (request: NextRequest, routeContext: { params: Promise<P> }) => {
    const session = await auth();
    if (
      !session?.user ||
      session.user.role !== "REALESTATE" ||
      session.user.verifyStatus !== "verified"
    ) {
      return NextResponse.json(
        { error: "부동산 중개사 인증 필요" },
        { status: 403 }
      );
    }
    const params = routeContext?.params
      ? await routeContext.params
      : ({} as P);
    return handler(request, { session: session as AgentSession, params });
  };
}
