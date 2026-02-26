/**
 * DB 기반 Rate Limiter
 *
 * Neon Postgres를 사용하여 서버리스 인스턴스 간에도 정확하게 동작합니다.
 *
 * @module lib/rate-limit
 */

import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp (ms)
}

// ---------------------------------------------------------------------------
// Main: Rate Limit 체크 (DB 기반)
// ---------------------------------------------------------------------------

export async function rateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowMs);

  try {
    const entry = await prisma.rateLimit.findUnique({
      where: { id: identifier },
    });

    // 윈도우 만료 또는 새 엔트리
    if (!entry || entry.resetTime < now) {
      await prisma.rateLimit.upsert({
        where: { id: identifier },
        update: { count: 1, resetTime },
        create: { id: identifier, count: 1, resetTime },
      });
      return { success: true, remaining: limit - 1, reset: resetTime.getTime() };
    }

    // 한도 초과 확인
    if (entry.count >= limit) {
      return { success: false, remaining: 0, reset: entry.resetTime.getTime() };
    }

    // 카운트 증가
    await prisma.rateLimit.update({
      where: { id: identifier },
      data: { count: entry.count + 1 },
    });

    return {
      success: true,
      remaining: limit - (entry.count + 1),
      reset: entry.resetTime.getTime(),
    };
  } catch {
    // DB 오류 시 요청 허용 (가용성 우선)
    return { success: true, remaining: limit, reset: resetTime.getTime() };
  }
}

// ---------------------------------------------------------------------------
// Helper: Rate Limit 헤더 생성
// ---------------------------------------------------------------------------

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}
