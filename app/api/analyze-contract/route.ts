import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { CONTRACT_ANALYSIS_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { stripHtml, truncateInput } from "@/lib/sanitize";
import { searchCourtCases } from "@/lib/court-api";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (보호 API: 30 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`analyze-contract:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Cost Guard (일일 OpenAI 호출 제한)
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const { contractText: rawText } = await req.json();
    const contractText = truncateInput(stripHtml(rawText || ""), 50000);

    if (!contractText) {
      return NextResponse.json({ error: "계약서 내용을 입력해주세요." }, { status: 400 });
    }

    // 계약서에서 키워드 추출 후 관련 판례 검색
    let courtContext = "";
    try {
      const keywords = extractContractKeywords(contractText);
      if (keywords.length > 0) {
        const cases = await searchCourtCases(keywords[0], 3);
        if (cases.length > 0) {
          courtContext = `\n\n## 관련 판례 참고\n${cases
            .map(
              (c) =>
                `- [${c.caseNumber}] ${c.caseName} (${c.courtName}, ${c.judgmentDate})\n  판시사항: ${c.summary}`
            )
            .join("\n")}
\n위 판례를 참고하여 계약서 분석 시 관련 법률 근거를 보강하세요.`;
        }
      }
    } catch (e) {
      console.warn("판례 검색 실패:", e);
    }

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: CONTRACT_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `다음 부동산 계약서를 분석해주세요:\n\n${contractText}${courtContext}\n\nJSON 형식으로만 응답하세요.`,
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
    console.error("Contract analysis error:", message);

    if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: `분석 중 오류: ${message}` }, { status: 500 });
  }
}

/** 계약서 텍스트에서 핵심 키워드 추출 */
function extractContractKeywords(text: string): string[] {
  const keywordPatterns = [
    "전세보증금", "보증금 반환", "임대차", "근저당", "계약해지",
    "위약금", "손해배상", "특약사항", "원상회복", "권리금",
    "전세권", "임차권", "대항력", "우선변제",
  ];

  const found = keywordPatterns.filter((kw) => text.includes(kw));

  // 가장 관련성 높은 검색어 조합
  if (found.length === 0) return ["부동산 계약 분쟁"];
  return [found.slice(0, 2).join(" ")];
}
