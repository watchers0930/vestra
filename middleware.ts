/**
 * Next.js Middleware (경량 버전)
 *
 * NextAuth v5 JWE 토큰을 직접 복호화하여 경로 보호
 * - auth() 전체를 import하지 않아 Edge Function 크기 최소화
 * - HKDF 키 파생 + jwtDecrypt로 암호화된 JWT 복호화
 *
 * @module middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";

async function getDerivedEncryptionKey(secret: string, salt: string) {
  return await hkdf(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64 // A256CBC-HS512
  );
}

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
    const encryptionKey = await getDerivedEncryptionKey(secret, cookieName);
    const { payload } = await jwtDecrypt(token, encryptionKey, {
      clockTolerance: 15,
    });
    return payload as { role?: string; id?: string };
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 루트("/") 접근 시: 로그인 사용자 → /dashboard 리다이렉트
  if (pathname === "/") {
    const token = await getToken(req);
    if (token) {
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // 비로그인 → 랜딩 페이지 (그대로 진행)
  }

  // 관리자 경로 보호
  if (pathname.startsWith("/admin")) {
    const token = await getToken(req);
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 프로필, 대시보드 보호 (로그인 필수)
  if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) {
    const token = await getToken(req);
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
