import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { REGISTRY_ANALYSIS_PROMPT } from "@/lib/prompts";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { stripHtml, truncateInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (공개 API: 10 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = rateLimit(`parse-registry:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { rawText: rawInput, estimatedPrice } = await req.json();

    // Input sanitization
    const rawText = truncateInput(stripHtml(rawInput || ""), 50000);

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "등기부등본 텍스트를 입력해주세요." },
        { status: 400 }
      );
    }

    // 1단계: 자체 파싱 엔진 (AI 미사용)
    const parsed = parseRegistry(rawText);

    // 2단계: 데이터 검증 엔진 (AI 미사용)
    const preValidation = validateParsedRegistry(parsed, estimatedPrice || 0);

    // 3단계: 자체 리스크 스코어링 (AI 미사용)
    const riskScore = calculateRiskScore(parsed, estimatedPrice || 0);

    // 4단계: AI 종합 의견 (OpenAI)
    let aiOpinion = "";
    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: REGISTRY_ANALYSIS_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              parsedTitle: parsed.title,
              gapguCount: parsed.gapgu.length,
              activeGapgu: parsed.gapgu.filter((e) => !e.isCancelled),
              eulguCount: parsed.eulgu.length,
              activeEulgu: parsed.eulgu.filter((e) => !e.isCancelled),
              summary: parsed.summary,
              riskScore: {
                totalScore: riskScore.totalScore,
                grade: riskScore.grade,
                gradeLabel: riskScore.gradeLabel,
                factors: riskScore.factors,
                mortgageRatio: riskScore.mortgageRatio,
              },
              estimatedPrice: estimatedPrice || 0,
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        aiOpinion = parsed.opinion || parsed.aiOpinion || "";
      }
    } catch {
      aiOpinion = "AI 의견을 생성할 수 없습니다. API 키를 확인해주세요.";
    }

    // 최종 검증 (AI의견 포함 크로스체크)
    const validation = validateParsedRegistry(
      parsed,
      estimatedPrice || 0,
      riskScore,
      aiOpinion
    );

    return NextResponse.json({
      parsed,
      validation,
      riskScore,
      aiOpinion,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Registry parse error:", message);
    return NextResponse.json(
      { error: `등기부등본 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
