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
  // 명시적으로 RATE_LIMIT_BYPASS=true 설정 시에만 바이패스 (로컬 개발용)
  if (process.env.RATE_LIMIT_BYPASS === "true") {
    return { success: true, remaining: limit, reset: Date.now() + windowMs };
  }

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
  } catch (error) {
    // DB 오류 시 요청 차단 (보안 우선)
    console.error("[RateLimit] DB 오류:", error);
    return { success: false, remaining: 0, reset: resetTime.getTime() };
  }
}

// ---------------------------------------------------------------------------
// FREE 티어 무제한 분석 타입 (내집스캔 경쟁우위 전략)
// ---------------------------------------------------------------------------

/** 일일 제한 없이 무료로 제공되는 분석 타입 */
export const FREE_UNLIMITED_TYPES = [
  "jeonse-safety",      // 전세 안전도 분석
  "rights-basic",       // 등기부 기본 분석
  "guarantee-check",    // 보증보험 가입 확인
  "analyze-rights",     // 권리분석 (등기부)
  "fraud-risk",         // 전세사기 위험도
  "loan-simulate",      // 대출 가심사
] as const;

/** 해당 분석 타입이 무제한 무료인지 확인 */
export function isFreeUnlimitedType(analysisType: string): boolean {
  return FREE_UNLIMITED_TYPES.includes(analysisType as typeof FREE_UNLIMITED_TYPES[number]);
}

// ---------------------------------------------------------------------------
// 일일 사용량 체크 (역할 기반)
// ---------------------------------------------------------------------------

/**
 * 게스트 식별자 생성: IP + User-Agent 조합으로 공유 IP 환경에서 구분도 향상
 */
export function guestIdentifier(ip: string, ua?: string | null): string {
  if (!ua) return `guest:${ip}`;
  // UA 해시 뒤 8자리를 추가하여 같은 IP의 다른 브라우저 구분
  let hash = 0;
  for (let i = 0; i < ua.length; i++) {
    hash = ((hash << 5) - hash + ua.charCodeAt(i)) | 0;
  }
  return `guest:${ip}:${(hash >>> 0).toString(36)}`;
}

export async function checkDailyUsage(
  userId: string,
  dailyLimit: number,
  analysisType?: string
): Promise<RateLimitResult> {
  // FREE 무제한 타입은 일일 제한 바이패스
  if (analysisType && isFreeUnlimitedType(analysisType)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { success: true, remaining: 9999, reset: tomorrow.getTime() };
  }
  // 명시적으로 RATE_LIMIT_BYPASS=true 설정 시에만 바이패스 (로컬 개발용)
  if (process.env.RATE_LIMIT_BYPASS === "true") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { success: true, remaining: dailyLimit, reset: tomorrow.getTime() };
  }

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
    // DB 에러 시 fail-closed: 무제한 호출 방지
    return { success: false, remaining: 0, reset: tomorrow.getTime() };
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
