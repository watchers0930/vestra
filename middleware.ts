/**
 * Next.js Middleware — API 인증 보호
 *
 * OpenAI 비용이 발생하는 API 라우트를 인증된 사용자만 접근 가능하도록 보호합니다.
 * 공개 API (등기 파싱, PDF 추출, 실거래가 조회)는 KIBO 데모용으로 인증 없이 접근 가능합니다.
 *
 * 쿠키 기반 세션 확인 방식으로 AUTH_SECRET 미설정 환경에서도 안전하게 동작합니다.
 *
 * @module middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// 보호 대상 API 경로 (OpenAI 비용 발생 라우트)
// ---------------------------------------------------------------------------

const PROTECTED_ROUTES = [
  "/api/analyze-rights",
  "/api/analyze-contract",
  "/api/predict-value",
  "/api/generate-document",
  "/api/chat",
];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 보호 대상 API인지 확인
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // NextAuth v5 세션 쿠키 확인 (프로덕션: __Secure- 접두사, 개발: 접두사 없음)
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다. AI 분석 기능을 사용하려면 로그인해주세요.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher: API 라우트만 대상 (정적 파일, 이미지 등 제외)
// ---------------------------------------------------------------------------

export const config = {
  matcher: ["/api/:path*"],
};
