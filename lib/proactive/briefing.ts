/**
 * 능동 인사이트 — AI 종합 브리핑
 * ────────────────────────────────
 * signals.ts가 뽑은 신호를 **근거로만** gpt-5-mini가 우선순위·요약·다음 행동을
 * 자연어로 종합한다. 환각 방지를 위해 신호 목록에 없는 사실은 만들지 않도록 제약한다.
 *
 * 견고성(규칙 0-5):
 *  - 비정상: 신호가 없으면 AI를 호출하지 않는다(비용 0). AI 실패 시 규칙 기반 폴백.
 *  - 규모: 신호는 상한(MAX_SIGNALS)이 걸린 상태로 들어오므로 입력 토큰이 통제된다.
 *
 * @module lib/proactive/briefing
 */

import { getOpenAIClient, OPENAI_MODEL, REASONING_ANALYTICAL } from "@/lib/openai";
import type { Signal, Briefing } from "./types";

const BRIEFING_SYSTEM_PROMPT = `당신은 베스트라(VESTRA)의 부동산 자산관리 AI 비서입니다.
사용자의 자산·임대차 계약·등기감시·구독 상태에서 추출된 "신호 목록"을 받아, 지금 가장 먼저 챙겨야 할 것을 종합해 안내합니다.

규칙:
- 반드시 제공된 신호 목록에 있는 사실만 사용하세요. 목록에 없는 수치·주소·날짜·상황을 추측하거나 지어내지 마세요.
- 가장 위험하거나 시급한 것부터 우선순위를 잡아 2~4문장으로 간결하게 요약하고, 구체적인 다음 행동을 제안하세요.
- 담백하고 실용적인 존댓말 한국어로 작성하세요. 과장·불안 조장·영업 문구는 쓰지 마세요.
- 신호가 여러 건이면 핵심만 묶어 말하고, 사소한 것까지 나열하지 마세요.`;

/** 규칙 기반 폴백 헤드라인 (AI 미사용/실패 시) */
function fallbackHeadline(signals: Signal[]): string {
  if (signals.length === 0) return "현재 특별히 확인할 사항이 없습니다.";
  const top = signals[0];
  const urgent = signals.filter((s) => s.severity === "critical" || s.severity === "high").length;
  const urgentText = urgent > 0 ? ` 이 중 ${urgent}건은 시급합니다.` : "";
  return `확인이 필요한 항목이 ${signals.length}건 있습니다.${urgentText} 가장 먼저: ${top.title}`;
}

/** AI를 호출하지 않는 규칙 기반 브리핑 (비용한도 초과 등에서 사용) */
export function fallbackBriefing(signals: Signal[]): Briefing {
  return { headline: fallbackHeadline(signals), aiUsed: false };
}

/**
 * 신호를 종합해 브리핑 헤드라인을 생성한다.
 * @param signals collectSignals 결과 (심각도순 정렬 가정)
 */
export async function generateBriefing(signals: Signal[]): Promise<Briefing> {
  if (signals.length === 0) {
    return { headline: "현재 특별히 확인할 사항이 없습니다.", aiUsed: false };
  }

  try {
    const openai = getOpenAIClient();
    const list = signals
      .map((s, i) => `${i + 1}. [${s.severity}] ${s.title} — ${s.detail}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: BRIEFING_SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음은 이 사용자의 부동산 상황 신호 목록입니다. 아래 신호에 있는 사실만 근거로 종합 브리핑을 작성하세요.\n\n${list}`,
        },
      ],
      reasoning_effort: REASONING_ANALYTICAL,
      max_completion_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("빈 응답");
    return { headline: content, aiUsed: true };
  } catch {
    // AI 실패해도 신호 카드는 그대로 노출되므로, 헤드라인만 규칙 기반으로 대체
    return { headline: fallbackHeadline(signals), aiUsed: false };
  }
}
