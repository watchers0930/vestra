import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
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
import { detectAnomalies, type AnomalyDetectionReport, type TimeSeriesPoint } from "@/lib/anomaly-detector";
import { VerifiedPipeline } from "@/lib/integrity-chain";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";
import { buildPolicyContext, logNewsUsage } from "@/lib/news-query";

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

    const { address: rawAddress, buildingName: rawBuildingName } = await req.json();
    const address = sanitizeField(rawAddress || "", 200);
    const buildingName = sanitizeField(rawBuildingName || "", 100);

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

    // 무결성 파이프라인 시작
    const pipeline = new VerifiedPipeline(`predict-${Date.now()}`);

    // 2단계: 자체 엔진으로 현재 시세 추정
    const priceEstimation = await pipeline.executeStage(
      "시세추정",
      { address, saleCount: comprehensive?.sale?.transactionCount ?? 0 },
      async () => estimatePrice(
        { address, aptName: address },
        comprehensive?.sale ?? null,
        comprehensive?.rent ?? null,
      ),
    );
    const currentPrice = priceEstimation.output.estimatedPrice;

    // 3단계: 자체 엔진으로 가치 전망 산출 (5모델 앙상블 + 거시경제)
    const predictionStage = await pipeline.executeStage(
      "가치전망",
      { currentPrice, macroFactors },
      async () => predictValue(
        currentPrice,
        comprehensive?.sale?.transactions ?? [],
        comprehensive?.rent ?? null,
        comprehensive?.jeonseRatio ?? null,
        macroFactors,
      ),
    );
    const predictionResult = predictionStage.output;

    // 3.5단계: 백테스팅 (36개월 데이터 있을 때)
    const backtestStage = await pipeline.executeStage(
      "백테스팅",
      { transactionCount: comprehensive?.sale?.transactions?.length ?? 0 },
      async () => comprehensive?.sale?.transactions
        ? runBacktest(comprehensive.sale.transactions)
        : null,
    );
    if (backtestStage.output) {
      predictionResult.backtestResult = backtestStage.output;
    }

    // 3.55단계: 이상탐지 (거래 이력 기반)
    let anomalyReport: AnomalyDetectionReport | null = null;
    try {
      const txForAnomaly = comprehensive?.sale?.transactions ?? [];
      if (txForAnomaly.length >= 5) {
        const timeSeriesData: TimeSeriesPoint[] = txForAnomaly
          .filter((t) => t.dealAmount > 0)
          .map((t) => ({
            timestamp: new Date(`${t.dealYear}-${String(t.dealMonth).padStart(2, "0")}-01`).getTime(),
            value: t.dealAmount,
            label: `${t.dealYear}.${t.dealMonth}`,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        if (timeSeriesData.length >= 5) {
          const anomalyStage = await pipeline.executeStage(
            "이상탐지",
            { transactionCount: timeSeriesData.length },
            async () => detectAnomalies(timeSeriesData),
          );
          anomalyReport = anomalyStage.output;
        }
      }
    } catch (anomalyError) {
      console.warn("이상탐지 실행 실패 (계속 진행):", anomalyError);
    }

    // 3.6단계: buildingName 기반 거래 필터링
    const allTx = comprehensive?.sale?.transactions ?? [];
    let filteredTx = allTx;
    if (buildingName && allTx.length > 0) {
      const bldg = buildingName.replace(/아파트$/, "").replace(/\s/g, "");
      const aptTx = allTx.filter((t) => {
        const n = t.aptName.replace(/아파트$/, "").replace(/\s/g, "");
        return n === bldg || n.includes(bldg) || bldg.includes(n);
      });
      if (aptTx.length > 0) filteredTx = aptTx;
    }

    // 4단계: 거래 필터링을 파이프라인에 기록
    await pipeline.executeStage(
      "거래필터링",
      { totalTx: allTx.length, buildingName: buildingName || null },
      async () => ({ filteredCount: filteredTx.length }),
    );

    // 4.5단계: 최근 관련 정책 조회
    let policyContext = "";
    let policyArticleIds: string[] = [];
    try {
      const policy = await buildPolicyContext(["규제", "대출", "공급", "금리"]);
      policyContext = policy.context;
      policyArticleIds = policy.articleIds;
    } catch {
      // 정책 조회 실패 시 무시
    }

    // 5단계: LLM으로 종합 의견만 생성
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
              aptTransactionCount: filteredTx.length,
              regionTransactionCount: comprehensive?.sale?.transactionCount ?? 0,
              jeonseRatio: comprehensive?.jeonseRatio ?? null,
              policyContext: policyContext || "관련 정책 없음",
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

    // LLM 의견도 파이프라인에 기록
    await pipeline.executeStage(
      "AI의견생성",
      { address, confidence: predictionResult.confidence },
      async () => ({ opinion: aiOpinion.slice(0, 50) }),
    );

    // 정책 활용 로그
    if (policyArticleIds.length > 0) {
      logNewsUsage(policyArticleIds, "prediction").catch(() => {});
    }

    // 파이프라인 확정 및 Merkle Root 생성
    const integrityResult = await pipeline.finalize();

    // 6단계: 프론트엔드 호환 응답 생성
    return NextResponse.json({
      ...predictionResult,
      aiOpinion,
      integrity: {
        merkleRoot: integrityResult.merkleRoot,
        totalSteps: integrityResult.report.totalSteps,
        isValid: integrityResult.report.isValid,
        stages: integrityResult.stages.map((s) => ({ name: s.name, hash: s.stepHash.slice(0, 16) })),
      },
      realTransactions: filteredTx.slice(0, 50) ?? [],
      priceStats: filteredTx.length > 0
        ? (() => {
            const prices = filteredTx.map((t) => t.dealAmount);
            return {
              avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
              minPrice: Math.min(...prices),
              maxPrice: Math.max(...prices),
              transactionCount: filteredTx.length,
              period: comprehensive?.sale?.period ?? "",
            };
          })()
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
      anomalyDetection: anomalyReport ? {
        anomalies: anomalyReport.anomalies,
        changePoints: anomalyReport.changePoints,
        statistics: anomalyReport.statistics,
        anomalyCount: anomalyReport.anomalies.length,
        hasSignificantAnomalies: anomalyReport.anomalies.some(a => a.severity === 'high' || a.severity === 'critical'),
      } : null,
      dataSources: [
        "국토교통부 실거래가",
        bokData.dataSource === "live" ? "한국은행 기준금리" : null,
        rebData?.dataSource === "live" ? "한국부동산원 가격지수" : null,
        buildingInfo ? "건축물대장" : null,
        seoulData?.dataSource === "live" ? "서울시 실거래가" : null,
        anomalyReport ? "시계열 이상탐지" : null,
      ].filter(Boolean),
    });
  } catch (error: unknown) {
    return handleApiError(error, "시세 예측");
  }
}
