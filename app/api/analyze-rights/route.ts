import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { RIGHTS_ANALYSIS_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (보호 API: 30 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = rateLimit(`analyze-rights:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { address: rawAddress } = await req.json();
    const address = sanitizeField(rawAddress || "", 200);

    if (!address) {
      return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: RIGHTS_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `다음 부동산의 권리분석을 수행해주세요: ${address}\n\n실제 시세와 권리관계를 가능한 정확하게 추정하여 분석해주세요. JSON 형식으로만 응답하세요.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
    }

    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Rights analysis error:", message);

    if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: `분석 중 오류: ${message}` }, { status: 500 });
  }
}
