/**
 * 메모리 기반 Rate Limiter
 *
 * Sliding window 방식으로 API 요청 속도를 제한합니다.
 * Vercel Serverless 환경에서도 동작하며, 외부 의존성이 없습니다.
 *
 * @module lib/rate-limit
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetTime: number; // Unix timestamp (ms)
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp (ms)
}

// ---------------------------------------------------------------------------
// Store (메모리 기반, 서버리스 인스턴스 단위)
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>();

// 5분마다 만료 엔트리 자동 정리 (메모리 누수 방지)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000); // 5분

  // Serverless 환경에서 프로세스 종료 시 정리
  if (typeof process !== "undefined" && process.on) {
    process.on("beforeExit", () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Main: Rate Limit 체크
// ---------------------------------------------------------------------------

/**
 * Rate limit 체크
 *
 * @param identifier - 고유 식별자 (IP, userId 등)
 * @param limit - 허용 요청 횟수
 * @param windowMs - 시간 윈도우 (밀리초, 기본 60초)
 * @returns { success, remaining, reset }
 */
export function rateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  // 새 엔트리 또는 윈도우 만료
  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    store.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, reset: resetTime };
  }

  // 기존 윈도우 내 요청
  entry.count++;

  if (entry.count > limit) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }

  return {
    success: true,
    remaining: limit - entry.count,
    reset: entry.resetTime,
  };
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
