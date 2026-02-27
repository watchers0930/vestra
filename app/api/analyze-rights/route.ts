import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { RIGHTS_ANALYSIS_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";

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

    // Cost Guard (일일 OpenAI 호출 제한)
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const { address: rawAddress } = await req.json();
    const address = sanitizeField(rawAddress || "", 200);

    if (!address) {
      return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 });
    }

    // 종합 시세 데이터 조회 (매매 + 전월세)
    let comprehensive = null;
    try {
      comprehensive = await fetchComprehensivePrices(address, 12);
    } catch (e) {
      console.warn("MOLIT API 종합 조회 실패:", e);
    }

    // 실거래 데이터 요약 텍스트 생성
    let realDataContext = "";

    // 매매 데이터
    if (comprehensive?.sale && comprehensive.sale.transactionCount > 0) {
      const s = comprehensive.sale;
      realDataContext += `\n\n## 매매 실거래 데이터 (최근 12개월)
- 평균 거래가: ${s.avgPrice.toLocaleString()}원
- 최저 거래가: ${s.minPrice.toLocaleString()}원
- 최고 거래가: ${s.maxPrice.toLocaleString()}원
- 거래 건수: ${s.transactionCount}건

최근 매매 거래 내역 (최대 10건):
${s.transactions
  .slice(0, 10)
  .map(
    (t) =>
      `- ${t.aptName} ${t.area}㎡ ${t.floor}층: ${t.dealAmount.toLocaleString()}원 (${t.dealYear}.${t.dealMonth}.${t.dealDay})`
  )
  .join("\n")}

위 매매 실거래 데이터를 기반으로 시세(estimatedPrice)를 산정하세요.`;
    }

    // 전월세 데이터
    if (comprehensive?.rent && (comprehensive.rent.jeonseCount > 0 || comprehensive.rent.wolseCount > 0)) {
      const r = comprehensive.rent;
      realDataContext += `\n\n## 전월세 실거래 데이터 (최근 12개월)
- 전세 평균 보증금: ${r.avgDeposit.toLocaleString()}원
- 전세 최저 보증금: ${r.minDeposit.toLocaleString()}원
- 전세 최고 보증금: ${r.maxDeposit.toLocaleString()}원
- 전세 거래 건수: ${r.jeonseCount}건
- 월세 거래 건수: ${r.wolseCount}건

최근 전월세 내역 (최대 10건):
${r.transactions
  .slice(0, 10)
  .map(
    (t) =>
      `- ${t.aptName} ${t.area}㎡ ${t.floor}층: ${t.rentType} 보증금 ${t.deposit.toLocaleString()}원${t.monthlyRent > 0 ? ` / 월세 ${t.monthlyRent.toLocaleString()}원` : ""} (${t.dealYear}.${t.dealMonth}.${t.dealDay})`
  )
  .join("\n")}

위 전월세 실거래 데이터를 기반으로 전세가(jeonsePrice)를 산정하세요.`;
    }

    // 실데이터 기반 전세가율
    if (comprehensive?.jeonseRatio !== null && comprehensive?.jeonseRatio !== undefined) {
      realDataContext += `\n\n## 실데이터 기반 전세가율: ${comprehensive.jeonseRatio}%
이 전세가율은 실제 매매가 평균과 전세 보증금 평균으로 계산된 값입니다. jeonseRatio에 이 값을 사용하세요.`;
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
      temperature: 0.2,
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
