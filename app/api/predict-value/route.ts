import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { VALUE_PREDICTION_OPINION_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { estimatePrice } from "@/lib/price-estimation";
import { predictValue } from "@/lib/prediction-engine";
import type { MacroEconomicFactors } from "@/lib/prediction-engine";
import { fetchBaseRate } from "@/lib/bok-api";
import { fetchSupplyVolume } from "@/lib/supply-api";
import { fetchREBMarketData } from "@/lib/reb-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";
import { fetchSeoulTransactions, crossValidatePrice } from "@/lib/seoul-data-api";
import { runBacktest } from "@/lib/backtesting";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

const formatKoreanPrice = (won: number) => formatKRW(won, "없음");

export async function POST(req: NextRequest) {
  try {
    // 인증 + 역할 기반 제한
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`predict-value:${userId || ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요." },
        { status: 429, headers: rateLimitHeaders(daily) }
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

    // 1단계: 종합 데이터 병렬 조회 (5개 소스)
    const [comprehensive, bokData, supplyData, rebData, buildingInfo, seoulData] = await Promise.all([
      fetchComprehensivePrices(address, 36).catch((e) => {
        console.warn("MOLIT API 종합 조회 실패:", e);
        return null;
      }),
      fetchBaseRate().catch(() => ({
        baseRate: 2.75, baseRateDate: "fallback", dataSource: "fallback" as const,
      })),
      fetchSupplyVolume(address).catch(() => null),
      fetchREBMarketData().catch(() => null),
      fetchBuildingInfoByAddress(address).catch(() => null),
      fetchSeoulTransactions(address).catch(() => null),
    ]);

    // 서울시 데이터 교차 검증
    const crossValidation = (comprehensive?.sale && seoulData?.transactionCount)
      ? crossValidatePrice(comprehensive.sale.avgPrice, seoulData.avgPrice)
      : undefined;

    // 거시경제 팩터 구성 (5개 소스 통합)
    const currentYear = new Date().getFullYear();
    const macroFactors: MacroEconomicFactors = {
      baseRate: bokData.baseRate,
      baseRateDate: bokData.baseRateDate,
      supplyVolume: supplyData?.volume12m,
      supplyRegion: supplyData?.region,
      dataSource: bokData.dataSource,
      // 한국부동산원
      rebSaleChangeRate: rebData?.saleChangeRate,
      rebJeonseChangeRate: rebData?.jeonseChangeRate,
      rebMarketTrend: rebData?.marketTrend,
      // 건축물대장
      buildingAge: buildingInfo?.buildYear ? currentYear - buildingInfo.buildYear : undefined,
      buildingFloors: buildingInfo?.floors,
      buildingHouseholds: buildingInfo?.households,
      // 교차 검증
      crossValidation,
    };

    // 2단계: 자체 엔진으로 현재 시세 추정
    const priceEstimation = estimatePrice(
      { address, aptName: address },
      comprehensive?.sale ?? null,
      comprehensive?.rent ?? null,
    );
    const currentPrice = priceEstimation.estimatedPrice;

    // 3단계: 자체 엔진으로 가치 전망 산출 (5모델 앙상블 + 거시경제)
    const predictionResult = predictValue(
      currentPrice,
      comprehensive?.sale?.transactions ?? [],
      comprehensive?.rent ?? null,
      comprehensive?.jeonseRatio ?? null,
      macroFactors,
    );

    // 3.5단계: 백테스팅 (36개월 데이터 있을 때)
    const backtestResult = comprehensive?.sale?.transactions
      ? runBacktest(comprehensive.sale.transactions)
      : null;
    if (backtestResult) {
      predictionResult.backtestResult = backtestResult;
    }

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
      // v2.5: 추가 데이터 소스
      buildingInfo: buildingInfo ?? null,
      rebMarketData: rebData ? {
        saleChangeRate: rebData.saleChangeRate,
        jeonseChangeRate: rebData.jeonseChangeRate,
        marketTrend: rebData.marketTrend,
      } : null,
      seoulCrossValidation: crossValidation ?? null,
      dataSources: [
        "국토교통부 실거래가",
        bokData.dataSource === "live" ? "한국은행 기준금리" : null,
        rebData?.dataSource === "live" ? "한국부동산원 가격지수" : null,
        buildingInfo ? "건축물대장" : null,
        seoulData?.dataSource === "live" ? "서울시 실거래가" : null,
      ].filter(Boolean),
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
