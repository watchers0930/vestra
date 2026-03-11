import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { UNIFIED_ANALYSIS_PROMPT } from "@/lib/prompts";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";
import { fetchComprehensivePrices, type PriceResult, type RentPriceResult } from "@/lib/molit-api";
import { estimatePrice } from "@/lib/price-estimation";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { stripHtml, truncateInput } from "@/lib/sanitize";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { simulateRedemption } from "@/lib/redemption-simulator";
import { propagateConfidence } from "@/lib/confidence-engine";
import { selfVerify } from "@/lib/self-verification";
import { calculateVScore } from "@/lib/v-score";
import { evaluateCrossAnalysis } from "@/lib/cross-analysis";
import { predictFraudRisk, extractFeaturesFromRiskScore, type FraudModelInput } from "@/lib/fraud-risk-model";
import { createEventBus } from "@/lib/event-bus";

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

/** 면적 문자열에서 숫자 추출 */
function parseAreaValue(areaStr: string): number {
  const m = areaStr.match(/([\d.]+)\s*㎡/);
  return m ? parseFloat(m[1]) : 0;
}

export async function POST(req: NextRequest) {
  try {
    // 인증 + 역할 기반 제한
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    // 분당 rate limit
    const rl = await rateLimit(`analyze-unified:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 일일 사용량 체크
    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    const { rawText: rawInput, estimatedPrice: userPrice, address: userAddress } = await req.json();

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

    // 주소 결정: 파싱된 주소 > 사용자 입력 주소
    const address = parsed.title.address || userAddress || "";

    // 2단계: MOLIT 실거래 데이터 조회 (선택적)
    let marketData: {
      sale: PriceResult | null;
      rent: RentPriceResult | null;
      jeonseRatio: number | null;
      districtSale?: PriceResult | null;
    } | null = null;
    let marketDataFiltered = false;

    if (address) {
      try {
        const comprehensive = await fetchComprehensivePrices(address, 12);
        if (comprehensive) {
          marketData = {
            sale: comprehensive.sale,
            rent: comprehensive.rent,
            jeonseRatio: comprehensive.jeonseRatio,
          };
        }
      } catch (e) {
        console.warn("MOLIT API 조회 실패:", e);
      }
    }

    // 2-1단계: 매매가 추정 엔진으로 비교매물 분석
    const regArea = parseAreaValue(parsed.title.area || "");
    const priceEstimation = estimatePrice(
      { address, aptName: address, area: regArea > 0 ? regArea : undefined },
      marketData?.sale ?? null,
      marketData?.rent ?? null,
    );
    marketDataFiltered = priceEstimation.method === "building_match" || priceEstimation.method === "area_match";

    // 필터링된 비교매물로 marketData 갱신
    if (marketDataFiltered && priceEstimation.comparables.length > 0 && marketData?.sale) {
      const districtSale = marketData.sale;
      marketData = {
        ...marketData,
        districtSale,
        sale: {
          avgPrice: priceEstimation.estimatedPrice,
          minPrice: priceEstimation.priceRange.min,
          maxPrice: priceEstimation.priceRange.max,
          transactionCount: priceEstimation.comparableCount,
          transactions: priceEstimation.comparables.sort(
            (a, b) =>
              b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
              (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
          ),
          period: districtSale.period,
        },
      };
    }

    // 추정가 결정: 사용자 입력 > 엔진 추정가 > 0
    const estimatedPrice = userPrice || priceEstimation.estimatedPrice;

    // 3단계: 데이터 검증 엔진 (AI 미사용)
    const preValidation = validateParsedRegistry(parsed, estimatedPrice);

    // 4단계: 자체 리스크 스코어링 (AI 미사용)
    const riskScore = calculateRiskScore(parsed, estimatedPrice);

    // 5단계: 통합 PropertyInfo 생성
    const propertyInfo = {
      address: parsed.title.address || address,
      type: parsed.title.purpose || "아파트",
      area: parsed.title.area || "",
      buildYear: parsed.title.buildingDetail || "",
      estimatedPrice,
      jeonsePrice: marketData?.rent?.avgDeposit || parsed.summary.totalJeonseAmount || 0,
      recentTransaction: marketData?.sale?.transactions?.[0]
        ? `${marketData.sale.transactions[0].dealYear}.${String(marketData.sale.transactions[0].dealMonth).padStart(2, "0")} / ${(marketData.sale.transactions[0].dealAmount / 100000000).toFixed(1)}억`
        : "",
    };

    // 6단계: 통합 RiskAnalysis 생성
    const jeonseRatio = marketData?.jeonseRatio ?? (
      estimatedPrice > 0 && propertyInfo.jeonsePrice > 0
        ? Math.round((propertyInfo.jeonsePrice / estimatedPrice) * 1000) / 10
        : 0
    );

    const riskAnalysis = {
      jeonseRatio,
      mortgageRatio: riskScore.mortgageRatio,
      safetyScore: riskScore.totalScore,
      riskScore: 100 - riskScore.totalScore,
      risks: riskScore.factors.map((f) => ({
        level: (f.severity === "critical" || f.severity === "high"
          ? "danger"
          : f.severity === "medium"
          ? "warning"
          : "safe") as "danger" | "warning" | "safe",
        title: f.description,
        description: f.detail,
      })),
    };

    // 7단계: AI 종합 의견 (OpenAI)
    let aiOpinion = "";
    try {
      const costGuard = await checkOpenAICostGuard(ip);
      if (!costGuard.allowed) {
        aiOpinion = "일일 AI 사용 한도를 초과했습니다. 자체 분석 결과만 제공됩니다.";
      } else {
        const openai = getOpenAIClient();

        // 시장 데이터 요약
        let marketContext = "";
        if (marketData?.sale && marketData.sale.transactionCount > 0) {
          const s = marketData.sale;
          const scope = marketDataFiltered ? "해당 건물" : "해당 구/군 전체";
          marketContext += `\n${scope} 매매 실거래: 평균 ${formatKoreanPrice(s.avgPrice)}, ${s.transactionCount}건`;
          if (marketDataFiltered && marketData.districtSale) {
            marketContext += `\n(참고: 구/군 전체 평균 ${formatKoreanPrice(marketData.districtSale.avgPrice)}, ${marketData.districtSale.transactionCount}건 — 다른 건물 포함)`;
          }
        }
        if (marketData?.rent && marketData.rent.jeonseCount > 0) {
          const r = marketData.rent;
          marketContext += `\n전세 실거래: 평균 보증금 ${(r.avgDeposit / 100000000).toFixed(1)}억, ${r.jeonseCount}건`;
        }
        if (jeonseRatio > 0) {
          marketContext += `\n전세가율: ${jeonseRatio}%`;
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: UNIFIED_ANALYSIS_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                parsedTitle: parsed.title,
                activeGapgu: parsed.gapgu.filter((e) => !e.isCancelled),
                activeEulgu: parsed.eulgu.filter((e) => !e.isCancelled),
                summary: parsed.summary,
                riskScore: {
                  totalScore: riskScore.totalScore,
                  grade: riskScore.grade,
                  gradeLabel: riskScore.gradeLabel,
                  factors: riskScore.factors,
                  mortgageRatio: riskScore.mortgageRatio,
                },
                estimatedPrice,
                estimatedPriceFormatted: formatKoreanPrice(estimatedPrice),
                jeonsePriceFormatted: formatKoreanPrice(propertyInfo.jeonsePrice),
                recentTransaction: propertyInfo.recentTransaction,
                marketContext: marketContext || "실거래 데이터 없음",
              }),
            },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const aiResult = JSON.parse(content);
          aiOpinion = aiResult.opinion || aiResult.aiOpinion || "";
        }
      }
    } catch {
      aiOpinion = "AI 의견을 생성할 수 없습니다. API 키를 확인해주세요.";
    }

    // 최종 검증 (AI의견 포함 크로스체크)
    const validation = validateParsedRegistry(
      parsed,
      estimatedPrice,
      riskScore,
      aiOpinion
    );

    // 8단계: 경매 배당 시뮬레이션 (특허 B: 권리순위 기반 배당 예측)
    const redemptionSimulation = simulateRedemption(
      parsed,
      estimatedPrice,
      propertyInfo.jeonsePrice || undefined,
      address,
    );

    // 9단계: 신뢰도 전파 (특허 C: 가중 기하평균 복합 신뢰도)
    const confidencePropagation = propagateConfidence(
      parsed,
      riskScore,
      estimatedPrice,
      priceEstimation.confidence,
      validation,
    );

    // 10단계: 자기검증 루프 (특허 H: AI ↔ 결정론적 교차검증)
    const selfVerification = selfVerify(
      aiOpinion,
      riskScore,
      estimatedPrice,
      validation,
      confidencePropagation.compositeReliability,
    );

    // 11단계: V-Score 통합 위험도 산출 (특허 H-1: 이질적 데이터 통합 점수화)
    const vScore = calculateVScore({
      riskScore,
      jeonseRatio: jeonseRatio || undefined,
      priceConfidence: priceEstimation.confidence,
      compositeReliability: confidencePropagation.compositeReliability,
    });

    // 12단계: 크로스 기능 교차 분석 (특허 H-3: 피드백 루프)
    const crossAnalysis = evaluateCrossAnalysis({
      riskScore,
      jeonseRatio: jeonseRatio || undefined,
      estimatedPrice,
      vScoreChange: undefined, // 첫 분석 시 이전 V-Score 없음
    });

    // 13단계: 전세사기 위험 예측 (특허 H-2: SHAP 기여도 분석)
    const fraudFeatures = extractFeaturesFromRiskScore(riskScore);
    if (jeonseRatio) fraudFeatures.jeonseRatio = jeonseRatio;
    const fraudRisk = predictFraudRisk(fraudFeatures as FraudModelInput);

    // 이벤트 버스: 분석 완료 이벤트 발행 (서버리스 per-request)
    const eventBus = createEventBus();
    eventBus.emit({
      type: "REGISTRY_ANALYZED",
      timestamp: new Date().toISOString(),
      data: { totalScore: riskScore.totalScore, factorCount: riskScore.factors.length } as Record<string, unknown>,
      sourceModule: "analyze-unified",
    });
    if (vScore) {
      eventBus.emit({
        type: "VSCORE_UPDATED",
        timestamp: new Date().toISOString(),
        data: { score: vScore.score, grade: vScore.grade } as Record<string, unknown>,
        sourceModule: "analyze-unified",
      });
    }

    return NextResponse.json({
      propertyInfo,
      riskAnalysis,
      parsed,
      validation,
      riskScore,
      marketData,
      aiOpinion,
      // 특허 강화 필드 (optional, 하위호환)
      redemptionSimulation,
      confidencePropagation,
      selfVerification,
      vScore,
      crossAnalysis,
      fraudRisk,
      eventLog: eventBus.getHistory(),
      dataSource: {
        registryParsed: true,
        molitAvailable: !!marketData,
        molitFiltered: marketDataFiltered,
        estimatedPriceSource: userPrice ? "user" : marketData?.sale?.avgPrice ? "molit" : "none",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Unified analysis error:", message);
    return NextResponse.json(
      { error: `통합 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
