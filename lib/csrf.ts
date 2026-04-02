/**
 * CSRF 방어 — Origin/Referer 검증
 *
 * Next.js App Router의 JSON API는 SameSite 쿠키 + CORS로 기본 보호되지만,
 * 공공기관 보안 감리 기준 충족을 위해 Origin 헤더 검증을 추가.
 */

import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : []),
  "https://vestra-plum.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

/**
 * 상태 변경 요청(POST/PUT/DELETE)에 대한 Origin 검증.
 * GET/HEAD/OPTIONS 요청은 통과.
 * Origin이 없는 경우(서버 사이드 호출) 통과.
 */
export function validateOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // 서버 사이드 호출: Vercel Cron 등 내부 호출만 허용
  if (!origin && !referer) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    // Cron 호출은 실제 시크릿 값 검증 (Bearer 토큰)
    if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return null;
    }
    // 브라우저가 아닌 호출도 차단 (Origin 없는 POST는 위험)
    return NextResponse.json(
      { error: "잘못된 요청 출처입니다" },
      { status: 403 }
    );
  }

  // Origin 검증
  if (origin && ALLOWED_ORIGINS.has(origin)) return null;

  // Referer 폴백 검증
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) return null;
    } catch {
      // invalid URL
    }
  }

  return NextResponse.json(
    { error: "잘못된 요청 출처입니다" },
    { status: 403 }
  );
}
