import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeMessages } from "@/lib/sanitize";
import { searchCourtCases } from "@/lib/court-api";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (보호 API: 30 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`chat:${ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await req.json();
    const messages = sanitizeMessages(body.messages || []);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    }

    // 최신 사용자 메시지에서 법률 키워드가 있으면 판례 검색
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    let courtContext = "";

    if (lastUserMsg) {
      try {
        const query = extractLegalQuery(lastUserMsg.content);
        if (query) {
          const cases = await searchCourtCases(query, 3);
          if (cases.length > 0) {
            courtContext = `\n\n[참고 판례]\n${cases
              .map(
                (c) => `- ${c.caseNumber} ${c.caseName} (${c.courtName}, ${c.judgmentDate}): ${c.summary}`
              )
              .join("\n")}\n\n위 판례를 참고하여 답변하되, 판례를 인용할 때는 사건번호를 명시하세요.`;
          }
        }
      } catch {
        // 판례 검색 실패 시 무시
      }
    }

    const openai = getOpenAIClient();

    const systemPrompt = CHAT_SYSTEM_PROMPT + courtContext;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Chat error:", message);

    if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: `응답 생성 중 오류: ${message}` }, { status: 500 });
  }
}

/** 사용자 메시지에서 법률 관련 키워드 추출 → 판례 검색어 생성 */
function extractLegalQuery(text: string): string | null {
  const legalKeywords = [
    "판례", "판결", "대법원", "법원",
    "전세보증금", "보증금 반환", "임대차", "전세사기",
    "근저당", "경매", "가압류", "압류",
    "계약해지", "위약금", "손해배상",
    "전세권", "임차권", "대항력", "우선변제",
    "취득세", "양도세", "종합부동산세",
    "하자보수", "원상회복", "권리금",
  ];

  const found = legalKeywords.filter((kw) => text.includes(kw));
  if (found.length === 0) return null;

  return found.slice(0, 2).join(" ");
}
