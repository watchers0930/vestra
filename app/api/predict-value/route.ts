import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { VALUE_PREDICTION_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (보호 API: 30 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`predict-value:${ip}`, 30);
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

    // 종합 시세 데이터 조회 (매매 + 전월세 + 연립/오피스텔)
    let comprehensive = null;
    try {
      comprehensive = await fetchComprehensivePrices(address, 6);
    } catch (e) {
      console.warn("MOLIT API 종합 조회 실패:", e);
    }

    // 실거래 데이터 요약 텍스트 생성
    let realDataContext = "";

    if (comprehensive?.sale && comprehensive.sale.transactionCount > 0) {
      const s = comprehensive.sale;
      realDataContext += `\n## 매매 실거래 데이터 (최근 12개월)
- 평균 거래가: ${s.avgPrice.toLocaleString()}원
- 최저 거래가: ${s.minPrice.toLocaleString()}원
- 최고 거래가: ${s.maxPrice.toLocaleString()}원
- 거래 건수: ${s.transactionCount}건

최근 거래 내역 (최대 15건):
${s.transactions
  .slice(0, 15)
  .map(
    (t) =>
      `- ${t.aptName} ${Math.round(t.area)}㎡ ${t.floor}층: ${t.dealAmount.toLocaleString()}원 (${t.dealYear}.${t.dealMonth}.${t.dealDay})`
  )
  .join("\n")}
`;
    }

    if (comprehensive?.rent && comprehensive.rent.jeonseCount > 0) {
      const r = comprehensive.rent;
      realDataContext += `\n## 전월세 실거래 데이터 (최근 12개월)
- 전세 평균 보증금: ${r.avgDeposit.toLocaleString()}원
- 전세 거래 건수: ${r.jeonseCount}건, 월세 건수: ${r.wolseCount}건
`;
    }

    if (comprehensive?.jeonseRatio !== null && comprehensive?.jeonseRatio !== undefined) {
      realDataContext += `\n- 실데이터 기반 전세가율: ${comprehensive.jeonseRatio}%\n`;
    }

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: VALUE_PREDICTION_PROMPT },
        {
          role: "user",
          content: `다음 부동산의 가치를 예측해주세요: ${address}
${realDataContext}
위 정보와 현재 부동산 시장 상황, 정책 동향, 지역 개발 계획을 종합적으로 고려하여
1년/5년/10년 후 가격을 낙관적/기본/비관적 시나리오로 예측해주세요.
JSON 형식으로만 응답하세요.`,
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

    // 실거래 데이터를 응답에 포함
    return NextResponse.json({
      ...result,
      realTransactions: comprehensive?.sale?.transactions.slice(0, 20) ?? [],
      priceStats: comprehensive?.sale
        ? {
            avgPrice: comprehensive.sale.avgPrice,
            minPrice: comprehensive.sale.minPrice,
            maxPrice: comprehensive.sale.maxPrice,
            transactionCount: comprehensive.sale.transactionCount,
            period: comprehensive.sale.period,
          }
        : null,
      rentStats: comprehensive?.rent
        ? {
            avgDeposit: comprehensive.rent.avgDeposit,
            jeonseCount: comprehensive.rent.jeonseCount,
            wolseCount: comprehensive.rent.wolseCount,
          }
        : null,
      calculatedJeonseRatio: comprehensive?.jeonseRatio ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Value prediction error:", message);

    if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: `예측 중 오류: ${message}` }, { status: 500 });
  }
}
