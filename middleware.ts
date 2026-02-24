/**
 * Next.js Middleware — API 인증 보호
 *
 * OpenAI 비용이 발생하는 API 라우트를 인증된 사용자만 접근 가능하도록 보호합니다.
 * 공개 API (등기 파싱, PDF 추출, 실거래가 조회)는 KIBO 데모용으로 인증 없이 접근 가능합니다.
 *
 * @module middleware
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 보호 대상 API인지 확인
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 미인증 시 401 반환
  if (!req.auth?.user) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다. AI 분석 기능을 사용하려면 로그인해주세요.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

// ---------------------------------------------------------------------------
// Matcher: API 라우트만 대상 (정적 파일, 이미지 등 제외)
// ---------------------------------------------------------------------------

export const config = {
  matcher: ["/api/:path*"],
};
