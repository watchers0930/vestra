import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { RIGHTS_ANALYSIS_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchRecentPrices } from "@/lib/molit-api";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (보호 API: 30 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`analyze-rights:${ip}`, 30);
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

    // 실거래 데이터 조회 (MOLIT API 키가 없어도 진행)
    let priceData = null;
    try {
      priceData = await fetchRecentPrices(address, 6);
    } catch (e) {
      console.warn("MOLIT API 조회 실패, 실거래 데이터 없이 진행:", e);
    }

    // 실거래 데이터 요약 텍스트 생성
    let realDataContext = "";
    if (priceData && priceData.transactionCount > 0) {
      realDataContext = `\n\n## 실거래 데이터 (최근 6개월)
- 평균 거래가: ${priceData.avgPrice.toLocaleString()}원
- 최저 거래가: ${priceData.minPrice.toLocaleString()}원
- 최고 거래가: ${priceData.maxPrice.toLocaleString()}원
- 거래 건수: ${priceData.transactionCount}건

최근 거래 내역 (최대 10건):
${priceData.transactions
  .slice(0, 10)
  .map(
    (t) =>
      `- ${t.aptName} ${t.area}㎡ ${t.floor}층: ${t.dealAmount.toLocaleString()}원 (${t.dealYear}.${t.dealMonth}.${t.dealDay})`
  )
  .join("\n")}

위 실거래 데이터를 기반으로 시세(estimatedPrice)와 전세가(jeonsePrice)를 산정하고, 최근 거래 정보(recentTransaction)에 반영하세요.`;
    }

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: RIGHTS_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `다음 부동산의 권리분석을 수행해주세요: ${address}${realDataContext}\n\n실제 시세와 권리관계를 가능한 정확하게 추정하여 분석해주세요. JSON 형식으로만 응답하세요.`,
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
