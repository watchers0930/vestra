/**
 * Next.js Middleware
 *
 * 인증 없이 모든 API를 공개합니다.
 * 비용 보호는 DB 기반 Rate Limit + Cost Guard로 처리합니다.
 *
 * @module middleware
 */

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
