/**
 * Next.js Proxy (경량 버전)
 *
 * NextAuth v5 JWE 토큰을 직접 복호화하여 경로 보호
 * - auth() 전체를 import하지 않아 Edge Function 크기 최소화
 * - HKDF 키 파생 + jwtDecrypt로 암호화된 JWT 복호화
 *
 * @module proxy
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";

// 개인회원(PERSONAL)이 직접 접근 시 renewal 대응 페이지로 유도하는 구 개인기능 페이지 매핑.
// 중개사(REALESTATE)·사업자는 이 구 페이지들을 그대로 공유하므로 PERSONAL만 redirect한다.
// 정확 경로 매칭만 함(예: /jeonse만 전환, /jeonse/analysis 등 renewal 미대응 하위는 구 유지).
const LEGACY_TO_RENEWAL: Record<string, string> = {
  "/rights": "/renewal/rights",
  "/contract": "/renewal/contract",
  "/tax": "/renewal/tax",
  "/assistant": "/renewal/assistant",
  "/monitoring": "/renewal/monitoring",
  "/official-price": "/renewal/official-price",
  "/loan-check": "/renewal/loan-check",
  "/decision-report": "/renewal/decision-report",
  "/jeonse": "/renewal/jeonse",
  "/price-map": "/renewal/price-map",
  "/listings/new": "/renewal/listing-new",
};

async function getDerivedEncryptionKey(secret: string, salt: string) {
  return await hkdf(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64
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
  } catch (err) {
    console.warn(
      "[Proxy] JWT 복호화 실패:",
      err instanceof Error ? err.message : "unknown",
      "| IP:",
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    );
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const token = await getToken(req);
    if (token) {
      // 역할별 홈으로 직접 보낸다(개인·중개사는 /dashboard 구 UI를 경유하지 않음).
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (token.role === "LAWYER") {
        return NextResponse.redirect(new URL("/lawyer", req.url));
      }
      if (token.role === "REALESTATE") {
        return NextResponse.redirect(new URL("/realtor", req.url));
      }
      if (token.role === "PERSONAL") {
        return NextResponse.redirect(new URL("/home", req.url));
      }
      // RENTAL_BIZ / BUSINESS: 사업자 대시보드
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 개인회원이 구 개인기능 페이지에 직접 접근하면 renewal 대응 페이지로 이동한다.
  // (중개사·사업자는 구 페이지를 공유하므로 그대로 통과)
  const renewalDest = LEGACY_TO_RENEWAL[pathname];
  if (renewalDest) {
    const token = await getToken(req);
    if (token?.role === "PERSONAL") {
      return NextResponse.redirect(new URL(renewalDest, req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    const token = await getToken(req);
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) {
    const token = await getToken(req);
    if (!token) {
      // 개인 보호 경로 미인증 → 구 /login 대신 renewal 홈의 로그인 모달로 유도
      return NextResponse.redirect(new URL("/home?auth=login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
