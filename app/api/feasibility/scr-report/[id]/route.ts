import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { getCachedReport } from "@/lib/feasibility/scr-report-cache";

export const maxDuration = 30;

/**
 * SCR 보고서 조회 API (GET)
 *
 * 인메모리 캐시에서 보고서를 조회합니다.
 * TTL: 24시간
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth + Rate Limit
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;

    const rl = await rateLimit(`feasibility-scr-get:${userId || ip}`, 20);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 2. 보고서 ID 추출
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "유효하지 않은 보고서 ID입니다." },
        { status: 400 }
      );
    }

    // 3. 캐시에서 조회
    const report = getCachedReport(id);
    if (!report) {
      return NextResponse.json(
        { error: "보고서를 찾을 수 없습니다. 만료되었거나 존재하지 않는 ID입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    return handleApiError(error, "SCR 보고서 조회");
  }
}
