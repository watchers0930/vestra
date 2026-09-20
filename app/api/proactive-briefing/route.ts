/**
 * GET /api/proactive-briefing
 * ───────────────────────────
 * 로그인 사용자의 자산·계약·등기감시·구독 상태를 종합해 "지금 신경 쓸 것"을
 * 우선순위 신호 + AI 헤드라인으로 반환한다. (능동 인사이트 브리핑)
 *
 * 보안·비용:
 *  - 인증 필수(본인 데이터만). rate limit(사용자당 6/분)으로 남용 차단.
 *  - AI(gpt-5-mini)는 신호가 있을 때만, 그리고 일일 비용가드 통과 시에만 호출.
 *  - 스키마 변경 없음(읽기 전용). 캐싱은 클라이언트가 담당.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { checkOpenAICostGuard } from "@/lib/openai";
import { collectSignals } from "@/lib/proactive/signals";
import { generateBriefing, fallbackBriefing } from "@/lib/proactive/briefing";
import { handleApiError } from "@/lib/api-error-handler";
import type { ProactiveBriefingResponse } from "@/lib/proactive/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rl = await rateLimit(`briefing:${userId}`, 6);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const signals = await collectSignals(userId);

    let briefing;
    if (signals.length === 0) {
      briefing = fallbackBriefing(signals); // "특이사항 없음"
    } else {
      // AI 종합은 비용가드를 통과할 때만. 초과 시 신호 카드는 유지하고 헤드라인만 규칙 기반.
      // 브리핑 전용 카운터("briefing:")·낮은 한도로 격리 → 권리분석 등 실기능 일일 한도를 잠식하지 않음.
      const guard = await checkOpenAICostGuard(userId, 20, "briefing:");
      briefing = guard.allowed ? await generateBriefing(signals) : fallbackBriefing(signals);
    }

    const body: ProactiveBriefingResponse = {
      generatedAt: new Date().toISOString(),
      signalCount: signals.length,
      signals,
      headline: briefing.headline,
      aiUsed: briefing.aiUsed,
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    return handleApiError(error, "능동 브리핑");
  }
}
