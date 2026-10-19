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
import { isOnboardingProtectedPath } from "@/lib/member-subscription/protected-paths";

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
    return payload as { role?: string; id?: string; needsPaidOnboarding?: boolean; verifyStatus?: string };
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
      if (token.role === "RENTAL_BIZ") {
        return NextResponse.redirect(new URL("/landlord", req.url));
      }
      // BUSINESS: 사업자 대시보드
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

  // 관리자 전용 로그인 페이지는 비로그인 접근을 허용(무한 리다이렉트 방지)
  if (pathname !== "/admin-login" && pathname.startsWith("/admin")) {
    const token = await getToken(req);
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
  }

  if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) {
    const token = await getToken(req);
    if (!token) {
      // 개인 보호 경로 미인증 → 구 /login 대신 renewal 홈의 로그인 모달로 유도
      return NextResponse.redirect(new URL("/home?auth=login", req.url));
    }
  }

  // 미결제 REALESTATE/BUSINESS 온보딩 가드 (optimistic — UX 유도 목적).
  // 레이아웃은 soft navigation 시 재실행되지 않으므로(Next.js Partial Rendering), 진입 유도는
  // 매 요청(soft-nav의 RSC 요청 포함) 실행되는 이 미들웨어에서 한다. DB는 건드리지 않고
  // JWT의 needsPaidOnboarding 플래그만 읽는다(플래그는 jwt callback이 서버에서 설정 → 위조 불가,
  // 단 로그인 시점 값이라 stale 가능). **실제 보안 경계는 미들웨어가 아니라 서버 데이터 계층**이다
  // (유료 기능·데이터는 requireMemberEntitlement가 DB 실시간으로 차단 — Next.js 공식 권고 구조).
  // signup/business·결제·API는 보호목록 밖이라 통과하므로 무한 리다이렉트가 없다.
  if (isOnboardingProtectedPath(pathname)) {
    const token = await getToken(req);
    if (token && (token.role === "REALESTATE" || token.role === "BUSINESS") && token.needsPaidOnboarding) {
      const step = token.verifyStatus !== "verified" ? 2 : 3;
      return NextResponse.redirect(new URL(`/signup/business/step-${step}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
