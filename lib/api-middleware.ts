/**
 * API Route Middleware Wrapper
 *
 * 공통 보호 로직(Rate Limit, Daily Usage, Cost Guard)을
 * 재사용 가능한 래퍼로 추출합니다.
 *
 * Usage:
 *   const protect = withApiProtection({ rateLimit: 30, analysisType: "contract", dailyLimit: 5 });
 *   export async function POST(req: NextRequest) {
 *     return protect(req, async () => { ... your handler logic ... });
 *   }
 *
 * @module lib/api-middleware
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { checkOpenAICostGuard } from "@/lib/openai";
import { auth, ROLE_LIMITS } from "@/lib/auth";

interface ApiProtectionOptions {
  /** Per-minute rate limit (default: 30) */
  rateLimit?: number;
  /** Whether to require authentication (default: false — guests allowed with IP-based limits) */
  requireAuth?: boolean;
  /** Analysis type key used for daily usage tracking (e.g. "contract", "chat") */
  analysisType?: string;
  /** Override daily limit (if not provided, uses role-based limit from auth session) */
  dailyLimit?: number;
}

/**
 * Creates a reusable API protection wrapper that handles:
 *  1. Rate limiting (per-minute, IP or user-based)
 *  2. Daily usage check (if analysisType provided)
 *  3. OpenAI cost guard (if analysisType provided)
 *  4. Calling the actual handler
 */
export function withApiProtection(options: ApiProtectionOptions = {}) {
  const {
    rateLimit: rateLimitPerMin = 30,
    requireAuth = false,
    analysisType,
    dailyLimit: dailyLimitOverride,
  } = options;

  return async function (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    // ── Resolve identity ──────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const session = await auth();
    const userId = session?.user?.id;

    if (requireAuth && !userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const identifier = userId || `guest:${ip}`;

    // ── 1. Rate limit (per-minute) ────────────────────────────────────
    const rateLimitKey = analysisType
      ? `${analysisType}:${identifier}`
      : `api:${identifier}`;

    const rl = await rateLimit(rateLimitKey, rateLimitPerMin);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // ── 2. Daily usage check (optional) ───────────────────────────────
    if (analysisType) {
      const resolvedDailyLimit =
        dailyLimitOverride ??
        (session?.user as { dailyLimit?: number })?.dailyLimit ??
        ROLE_LIMITS.GUEST;

      const daily = await checkDailyUsage(
        identifier,
        resolvedDailyLimit,
        analysisType
      );
      if (!daily.success) {
        return NextResponse.json(
          {
            error: userId
              ? "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요."
              : "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요.",
          },
          { status: 429, headers: rateLimitHeaders(daily) }
        );
      }
    }

    // ── 3. Cost guard (optional, same trigger as daily usage) ─────────
    if (analysisType) {
      const costGuard = await checkOpenAICostGuard(identifier);
      if (!costGuard.allowed) {
        return NextResponse.json(
          { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
          { status: 429 }
        );
      }
    }

    // ── 4. Call the actual handler ────────────────────────────────────
    return handler();
  };
}
