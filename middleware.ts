/**
 * Next.js Middleware (경량 버전)
 *
 * JWT 토큰을 직접 디코딩하여 경로 보호
 * - auth() 전체를 import하지 않아 Edge Function 크기 최소화
 * - 공개 경로: /, /login, /api/auth/*, 정적 파일
 * - 관리자 경로: /admin/* → ADMIN만
 * - 프로필 경로: /profile → 로그인 필수
 *
 * @module middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function getToken(req: NextRequest) {
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as { role?: string; id?: string };
  } catch {
    // 서명 방식이 다를 수 있으므로 salt 포함하여 재시도
    try {
      const saltedSecret = `authjs.session-token${secret}`;
      const key = new TextEncoder().encode(saltedSecret);
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      return payload as { role?: string; id?: string };
    } catch {
      return null;
    }
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 관리자 경로 보호
  if (pathname.startsWith("/admin")) {
    const token = await getToken(req);
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 프로필 페이지 보호 (로그인 필수)
  if (pathname.startsWith("/profile")) {
    const token = await getToken(req);
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // NextAuth, 정적 파일, 파비콘 제외
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
