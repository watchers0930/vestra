import { NextResponse } from "next/server";

/**
 * 사업성분석(FeasibilityReport)은 기업(BUSINESS) 회원 전용 기능이다.
 * 역할 계층: 부동산/임대사업자 = 사업자 기본 기능, 기업 = 기본 + 사업성분석.
 * 관리자(ADMIN)는 전 기능 접근.
 */
export const FEASIBILITY_ROLES = ["BUSINESS", "ADMIN"] as const;

export function canUseFeasibility(role: string | null | undefined): boolean {
  return !!role && (FEASIBILITY_ROLES as readonly string[]).includes(role);
}

/**
 * 서버 라우트 가드. 접근 가능하면 null, 불가하면 403 응답을 반환한다.
 * 사용: `const gate = assertFeasibilityAccess(session); if (gate) return gate;`
 */
export function assertFeasibilityAccess(
  session: { user?: { role?: string | null } } | null,
): NextResponse | null {
  if (!canUseFeasibility(session?.user?.role)) {
    return NextResponse.json(
      { error: "사업성분석은 기업 회원 전용 기능입니다. 마이페이지에서 기업 회원으로 전환해주세요." },
      { status: 403 },
    );
  }
  return null;
}
