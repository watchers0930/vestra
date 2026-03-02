/**
 * Next.js Middleware
 *
 * NextAuth v5 세션 확인 + 경로 보호
 * - 공개 경로: /, /login, /api/auth/*, 정적 파일
 * - 분석 API: 비인증 시 GUEST 제한으로 통과 (rate-limit에서 처리)
 * - 관리자 경로: /admin/* → ADMIN만
 *
 * @module middleware
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 관리자 경로 보호
  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user || req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 프로필 페이지 보호 (로그인 필수)
  if (pathname.startsWith("/profile")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // NextAuth, 정적 파일, 파비콘 제외
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
