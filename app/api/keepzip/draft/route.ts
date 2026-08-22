import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import {
  validateDraftInput,
  causeSystemPrompt,
  buildUserPrompt,
  causeLabel,
} from "@/lib/keepzip/cd-template";

/**
 * POST /api/keepzip/draft
 * ──────────────────────────────────────────────────────────────────────────
 * 집키퍼 AI 내용증명 초안 생성 (비저장 미리보기). 설계서 §6·§8.
 * 흐름: validateOrigin → auth(로그인 필수) → rateLimit → dailyUsage
 *       → 서버 입력 재검증(cd-template) → costGuard → OpenAI(gpt-4.1-mini, JSON)
 * ⚠️ 초안은 미리보기이며, 실제 발송 전 변호사 승인·직인이 필수(§8.2).
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    // 인증 — 로그인 사용자만(내용증명은 법적 문서)
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`keepzip-draft:${userId}`, 20);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    // 서버 입력 재검증 + 정제
    const body = await req.json().catch(() => null);
    const parsed = validateDraftInput(body);
    if (!parsed.ok || !parsed.data) {
      return NextResponse.json({ error: parsed.error ?? "잘못된 요청입니다." }, { status: 400 });
    }
    const input = parsed.data;

    // Cost Guard (일일 OpenAI 호출 제한)
    const costGuard = await checkOpenAICostGuard(userId);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: causeSystemPrompt(input.cause) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
    }

    let doc: { title?: string; content?: string };
    try {
      doc = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI 응답 형식 오류입니다." }, { status: 502 });
    }

    return NextResponse.json({
      cause: input.cause,
      causeLabel: causeLabel(input.cause),
      senderSide: input.senderSide,
      title: doc.title ?? causeLabel(input.cause),
      content: doc.content ?? "",
    });
  } catch (error: unknown) {
    return handleApiError(error, "내용증명 초안 생성");
  }
}
