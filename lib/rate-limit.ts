/**
 * DB 기반 Rate Limiter
 *
 * Neon Postgres를 사용하여 서버리스 인스턴스 간에도 정확하게 동작합니다.
 * 역할 기반 일일 사용량 제한 + 분당 rate limit 지원.
 *
 * @module lib/rate-limit
 */

import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp (ms)
}

// ---------------------------------------------------------------------------
// Main: Rate Limit 체크 (분당 제한, DB 기반)
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
// 일일 사용량 체크 (역할 기반)
// ---------------------------------------------------------------------------

export async function checkDailyUsage(
  userId: string,
  dailyLimit: number
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const id = `daily:${userId}:${today}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  try {
    const usage = await prisma.dailyUsage.upsert({
      where: { id },
      update: { count: { increment: 1 } },
      create: { id, date: today, count: 1 },
    });

    if (usage.count > dailyLimit) {
      return { success: false, remaining: 0, reset: tomorrow.getTime() };
    }

    return {
      success: true,
      remaining: dailyLimit - usage.count,
      reset: tomorrow.getTime(),
    };
  } catch {
    return { success: true, remaining: dailyLimit, reset: tomorrow.getTime() };
  }
}

/** 일일 사용 현황 조회 (카운트만, increment 없음) */
export async function getDailyUsageCount(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const id = `daily:${userId}:${today}`;

  try {
    const usage = await prisma.dailyUsage.findUnique({ where: { id } });
    return usage?.count || 0;
  } catch {
    return 0;
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
