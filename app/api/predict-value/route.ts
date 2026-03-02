import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { VALUE_PREDICTION_OPINION_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { estimatePrice } from "@/lib/price-estimation";
import { predictValue } from "@/lib/prediction-engine";

/** 원 단위 숫자를 "X억 Y만원" 형태로 변환 */
function formatKoreanPrice(won: number): string {
  if (won <= 0) return "없음";
  const eok = Math.floor(won / 100000000);
  const man = Math.round((won % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  if (man > 0) return `${man.toLocaleString()}만원`;
  return `${won.toLocaleString()}원`;
}

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

    // 1단계: 종합 시세 데이터 조회 (12개월 - 추세 분석용)
    let comprehensive = null;
    try {
      comprehensive = await fetchComprehensivePrices(address, 12);
    } catch (e) {
      console.warn("MOLIT API 종합 조회 실패:", e);
    }

    // 2단계: 자체 엔진으로 현재 시세 추정
    const priceEstimation = estimatePrice(
      { address, aptName: address },
      comprehensive?.sale ?? null,
      comprehensive?.rent ?? null,
    );
    const currentPrice = priceEstimation.estimatedPrice;

    // 3단계: 자체 엔진으로 가치 전망 산출
    const predictionResult = predictValue(
      currentPrice,
      comprehensive?.sale?.transactions ?? [],
      comprehensive?.rent ?? null,
      comprehensive?.jeonseRatio ?? null,
    );

    // 4단계: LLM으로 종합 의견만 생성
    let aiOpinion = "";
    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: VALUE_PREDICTION_OPINION_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              address,
              currentPrice,
              formattedPrice: formatKoreanPrice(currentPrice),
              predictions: predictionResult.predictions,
              factors: predictionResult.factors,
              confidence: predictionResult.confidence,
              transactionCount: comprehensive?.sale?.transactionCount ?? 0,
              jeonseRatio: comprehensive?.jeonseRatio ?? null,
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        aiOpinion = parsed.aiOpinion || parsed.opinion || "";
      }
    } catch {
      aiOpinion = "AI 의견 생성에 실패했습니다. 자체 분석 결과를 참고해주세요.";
    }

    // 5단계: 프론트엔드 호환 응답 생성
    return NextResponse.json({
      ...predictionResult,
      aiOpinion,
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
