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
    // 만료된 윈도우는 먼저 리셋 (atomic upsert)
    await prisma.rateLimit.upsert({
      where: { id: identifier },
      update: {},  // 존재하면 아무것도 안 함 (아래에서 처리)
      create: { id: identifier, count: 0, resetTime },
    });

    // 윈도우 만료 시 atomic 리셋
    await prisma.rateLimit.updateMany({
      where: { id: identifier, resetTime: { lt: now } },
      data: { count: 0, resetTime },
    });

    // Atomic increment + 현재 값 반환
    const updated = await prisma.rateLimit.update({
      where: { id: identifier },
      data: { count: { increment: 1 } },
    });

    if (updated.count > limit) {
      return { success: false, remaining: 0, reset: updated.resetTime.getTime() };
    }

    return {
      success: true,
      remaining: limit - updated.count,
      reset: updated.resetTime.getTime(),
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
