import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { UNIFIED_ANALYSIS_PROMPT } from "@/lib/prompts";
import { parseRegistry, compressFloorData } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";
import { fetchComprehensivePrices, type PriceResult, type RentPriceResult } from "@/lib/molit-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";
import { estimatePrice } from "@/lib/price-estimation";
import { stripHtml, truncateInput } from "@/lib/sanitize";
import { simulateRedemption } from "@/lib/redemption-simulator";
import { propagateConfidence } from "@/lib/confidence-engine";
import { selfVerify } from "@/lib/self-verification";
import { calculateVScore } from "@/lib/v-score";
import { evaluateCrossAnalysis } from "@/lib/cross-analysis";
import { predictFraudRisk, extractFeaturesFromRiskScore, type FraudModelInput } from "@/lib/fraud-risk-model";
import { createEventBus } from "@/lib/event-bus";
import { analyzeRightsGraph } from "@/lib/rights-graph-engine";
import { generateChecklist, groupChecklistByCategory } from "@/lib/checklist-generator";
import { formatKRW } from "@/lib/utils";
import { fetchKaptInfoByAddress } from "@/lib/kapt-api";
import { runSafetyDiagnosis } from "@/lib/safety-diagnosis";
import { evaluateTitleInsurance } from "@/lib/title-insurance";
import { generateContractClauses } from "@/lib/contract-clause-generator";

// ─── 유틸리티 ───

const formatKoreanPrice = (won: number) => formatKRW(won, "없음");

/** 면적 문자열에서 숫자 추출 */
function parseAreaValue(areaStr: string): number {
  const m = areaStr.match(/([\d.]+)\s*㎡/);
  return m ? parseFloat(m[1]) : 0;
}

// ─── 입력 전처리 ───

export function sanitizeInput(rawInput: string): string {
  let sanitized = rawInput || "";

  // HTML 취소선 태그 감지 → 【말소】 마커 삽입 (stripHtml 전에 처리)
  sanitized = sanitized.replace(/<(?:del|s|strike)\b[^>]*>([\s\S]*?)<\/(?:del|s|strike)>/gi, "【말소】$1");
  sanitized = sanitized.replace(/<[^>]*(?:text-decoration\s*:\s*line-through|class\s*=\s*["'][^"']*(?:cancel|deleted|strikethrough|malso)[^"']*["'])[^>]*>([\s\S]*?)<\/[^>]+>/gi, "【말소】$1");

  sanitized = sanitized.replace(/<br\s*\/?>/gi, "\n");
  sanitized = sanitized.replace(/<\/(?:p|div|tr|li|td|th)>/gi, "\n");
  sanitized = stripHtml(sanitized);
  sanitized = compressFloorData(sanitized);
  return truncateInput(sanitized, 50000);
}

// ─── 시장 데이터 조회 ───

export interface MarketDataResult {
  sale: PriceResult | null;
  rent: RentPriceResult | null;
  jeonseRatio: number | null;
  districtSale?: PriceResult | null;
}

export async function fetchMarketData(address: string) {
  const [comprehensive, kaptResult, buildingInfo] = await Promise.all([
    fetchComprehensivePrices(address, 12).catch((e) => {
      console.warn("MOLIT API 조회 실패:", e);
      return null;
    }),
    fetchKaptInfoByAddress(address).catch((e) => {
      console.warn("K-apt 단지정보 조회 실패:", e);
      return null;
    }),
    fetchBuildingInfoByAddress(address).catch((e) => {
      console.warn("건축물대장 조회 실패:", e);
      return null;
    }),
  ]);

  return {
    marketData: comprehensive ? {
      sale: comprehensive.sale,
      rent: comprehensive.rent,
      jeonseRatio: comprehensive.jeonseRatio,
    } as MarketDataResult : null,
    kaptInfo: kaptResult,
    buildingResult: buildingInfo,
  };
}

// ─── 핵심 분석 파이프라인 ───

export interface AnalysisInput {
  rawText: string;
  userPrice?: number;
  address: string;
  inputSource?: string;
  ip: string;
}

export async function runAnalysisPipeline(input: AnalysisInput) {
  const { rawText, userPrice, address: userAddress, inputSource, ip } = input;

  // 1단계: 자체 파싱 엔진 (AI 미사용)
  const parsed = parseRegistry(rawText);

  // 디버그: 을구 말소 상태 로그
  if (parsed.eulgu.length > 0) {
    console.log("[DEBUG] 을구 파싱 결과:");
    for (const e of parsed.eulgu) {
      console.log(`  #${e.order} ${e.purpose} | 말소=${e.isCancelled} | 금액=${e.amount} | detail(50)="${e.detail.slice(0, 50)}"`);
    }
    console.log(`[DEBUG] 활성 근저당 합계: ${parsed.eulgu.filter(e => !e.isCancelled && /근저당|저당/.test(e.purpose)).reduce((s, e) => s + e.amount, 0)}`);
  }

  // 주소 결정
  const address = parsed.title.address || userAddress || "";

  // 2단계: 시장 데이터 조회
  let marketData: MarketDataResult | null = null;
  let marketDataFiltered = false;
  let kaptInfo: Awaited<ReturnType<typeof fetchKaptInfoByAddress>> | null = null;
  let buildingResult: Awaited<ReturnType<typeof fetchBuildingInfoByAddress>> | null = null;

  if (address) {
    const fetched = await fetchMarketData(address);
    marketData = fetched.marketData;
    kaptInfo = fetched.kaptInfo;
    buildingResult = fetched.buildingResult;
  }

  // 2-1단계: 매매가 추정
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

  const estimatedPrice = userPrice || priceEstimation.estimatedPrice;

  // 3단계: 데이터 검증
  validateParsedRegistry(parsed, estimatedPrice);

  // 4단계: 리스크 스코어링
  const riskScore = calculateRiskScore(parsed, estimatedPrice);

  // 4-1: 그래프 기반 권리관계 분석
  const graphAnalysis = analyzeRightsGraph(parsed, estimatedPrice);

  // 4-2: 동적 체크리스트
  const checklist = generateChecklist(riskScore);
  const checklistByCategory = groupChecklistByCategory(checklist);

  // 4-3: 안전진단 + 권원보험 + 계약 특약
  const buildingPurpose = buildingResult?.mainPurpose || undefined;
  const safetyDiagnosis = runSafetyDiagnosis(parsed, riskScore, estimatedPrice, buildingPurpose, rawText);
  const titleInsurance = estimatedPrice > 0 ? evaluateTitleInsurance(estimatedPrice, riskScore) : null;
  const contractClauses = generateContractClauses(riskScore, parsed);

  // 5단계: PropertyInfo
  const displayAddress = inputSource === "codef" && userAddress
    ? userAddress
    : parsed.title.address || address;

  const propertyInfo = {
    address: displayAddress,
    type: parsed.title.purpose || "아파트",
    area: parsed.title.area || "",
    buildYear: parsed.title.buildingDetail || "",
    estimatedPrice,
    jeonsePrice: marketData?.rent?.avgDeposit || parsed.summary.totalJeonseAmount || 0,
    recentTransaction: marketData?.sale?.transactions?.[0]
      ? `${marketData.sale.transactions[0].dealYear}.${String(marketData.sale.transactions[0].dealMonth).padStart(2, "0")} / ${(marketData.sale.transactions[0].dealAmount / 100000000).toFixed(1)}억`
      : "",
  };

  // 6단계: 전세가율 / RiskAnalysis
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

  // 7단계: AI 종합 의견
  let aiOpinion = "";
  try {
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      aiOpinion = "일일 AI 사용 한도를 초과했습니다. 자체 분석 결과만 제공됩니다.";
    } else {
      const openai = getOpenAIClient();

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

  // 최종 검증
  const validation = validateParsedRegistry(parsed, estimatedPrice, riskScore, aiOpinion);

  // 8단계: 경매 배당 시뮬레이션
  const redemptionSimulation = simulateRedemption(
    parsed, estimatedPrice, propertyInfo.jeonsePrice || undefined, address,
  );

  // 9단계: 신뢰도 전파
  const confidencePropagation = propagateConfidence(
    parsed, riskScore, estimatedPrice, priceEstimation.confidence, validation,
  );

  // 10단계: 자기검증 루프
  const selfVerification = selfVerify(
    aiOpinion, riskScore, estimatedPrice, validation,
    confidencePropagation.compositeReliability,
  );

  // 11단계: V-Score
  const vScore = calculateVScore({
    riskScore,
    jeonseRatio: jeonseRatio || undefined,
    priceConfidence: priceEstimation.confidence,
    compositeReliability: confidencePropagation.compositeReliability,
  });

  // 12단계: 크로스 분석
  const crossAnalysis = evaluateCrossAnalysis({
    riskScore,
    jeonseRatio: jeonseRatio || undefined,
    estimatedPrice,
    vScoreChange: undefined,
  });

  // 13단계: 전세사기 위험 예측
  const fraudFeatures = extractFeaturesFromRiskScore(riskScore);
  if (jeonseRatio) fraudFeatures.jeonseRatio = jeonseRatio;
  const fraudRisk = predictFraudRisk(fraudFeatures as FraudModelInput);

  // 이벤트 버스
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

  // graphAnalysis Map → 객체 변환
  const serializedGraphAnalysis = {
    ...graphAnalysis,
    riskPropagation: {
      ...graphAnalysis.riskPropagation,
      nodeRisks: Object.fromEntries(graphAnalysis.riskPropagation.nodeRisks),
    },
  };

  return {
    propertyInfo,
    riskAnalysis,
    parsed,
    validation,
    riskScore,
    marketData,
    marketDataFiltered,
    aiOpinion,
    graphAnalysis: serializedGraphAnalysis,
    redemptionSimulation,
    confidencePropagation,
    selfVerification,
    vScore,
    crossAnalysis,
    fraudRisk,
    checklist,
    checklistByCategory,
    safetyDiagnosis,
    titleInsurance,
    contractClauses,
    eventLog: eventBus.getHistory(),
    kaptInfo,
    inputSource,
    estimatedPrice,
  };
}
