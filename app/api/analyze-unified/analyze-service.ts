import { getOpenAIClient, checkOpenAICostGuard, OPENAI_MODEL, REASONING_ANALYTICAL } from "@/lib/openai";
import {
  judgeAnalysisQuality,
  type QualityJudgment,
  type QualityGroundTruth,
} from "@/lib/ai-quality-gate";
import { UNIFIED_ANALYSIS_PROMPT } from "@/lib/prompts";
import { parseRegistry, compressFloorData } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";
import { fetchComprehensivePrices, type PriceResult, type RentPriceResult } from "@/lib/molit-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";
import { estimatePrice } from "@/lib/price-estimation";
import { buildAnalysisSources } from "@/lib/analysis-sources";
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

/** OpenAI chat 메시지(사용 역할 한정) */
type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

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
  // 보안: 을구 파싱 결과(채권자명 등 등기 원문)는 로그에 남기지 않는다.

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

  // 5단계: PropertyInfo — 주소 기반 조회(틸코/주소검색)면 입력 주소를 우선 표기
  const displayAddress = (inputSource === "tilko" || inputSource === "address") && userAddress
    ? userAddress
    : parsed.title.address || address;

  // 최근 거래: 추정가 산정에 실제 사용한 비교매물(건물명/면적 매칭) 중 가장 최근 1건만 사용한다.
  // 구/군 전체 평균(district_avg)·fallback은 대상 물건과 평형·건물이 달라 추정가와 모순되므로 표기하지 않는다.
  const recentComparable = marketDataFiltered
    ? [...priceEstimation.comparables].sort(
        (a, b) =>
          b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
          (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
      )[0]
    : undefined;

  const propertyInfo = {
    address: displayAddress,
    type: parsed.title.purpose || (buildingResult?.mainPurpose || "용도 미확인"),
    area: parsed.title.area || "",
    buildYear: parsed.title.buildingDetail || "",
    estimatedPrice,
    jeonsePrice: marketData?.rent?.avgDeposit || parsed.summary.totalJeonseAmount || 0,
    recentTransaction: recentComparable
      ? `${recentComparable.dealYear}.${String(recentComparable.dealMonth).padStart(2, "0")} / ${(recentComparable.dealAmount / 100000000).toFixed(1)}억`
      : "",
  };

  // P0-1: 권리분석 가능 여부 — 유효한 등기 데이터·소유자가 없으면 안전점수를 산출/표시하지 않는다.
  // (등기부 미제출·파싱 실패·소유자 미확인 상태를 "안전 100점"으로 오인시키는 허위 안심 방지)
  const hasRegistryEntries =
    parsed.summary.activeGapguEntries > 0 || parsed.summary.activeEulguEntries > 0;
  const currentOwner =
    [...parsed.gapgu]
      .filter(
        (e) =>
          !e.isCancelled &&
          /소유권(보존|이전)/.test(e.purpose) &&
          // 소유권이전청구권가등기·가처분·예고등기 등은 현재 소유자가 아니므로 제외(본등기만 인정)
          !/가등기|청구권|가처분|예고/.test(e.purpose) &&
          e.holder,
      )
      .pop()?.holder || "";
  const rightsAnalyzable = hasRegistryEntries && Boolean(currentOwner);
  const rightsUnavailableReason = !hasRegistryEntries
    ? "등기부등본이 제출되지 않았거나 인식되지 않아 권리관계·안전점수를 분석할 수 없습니다. 등기부등본을 업로드하면 소유자·권리관계·안전점수를 분석해 드립니다."
    : !currentOwner
      ? "등기부에서 현재 소유자 정보를 확인할 수 없어 안전점수를 산출하지 않았습니다. 등기부등본 원본이 올바른지(일부 누락·흐림 여부) 확인해 주세요."
      : undefined;

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
    analyzable: rightsAnalyzable,
    unavailableReason: rightsUnavailableReason,
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

  // 7단계: AI 종합 의견 + 품질게이트(LLM-as-judge)
  let aiOpinion = "";
  let qualityGate: QualityJudgment | null = null;
  if (!rightsAnalyzable) {
    // 유효한 등기 데이터가 없으면 AI 의견을 생성하지 않는다(허위 의견·"등기부 기반 자동생성" 오안내·불필요한 LLM 비용 방지).
    aiOpinion = rightsUnavailableReason
      || "유효한 등기부 데이터가 없어 AI 종합 의견을 생성하지 않았습니다. 등기부등본을 업로드해 주세요.";
  } else {
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

      // 생성 로직을 재사용 함수로 분리 — 초기 생성 + (품질 미달 시) 교정 재생성에 동일 사용
      const opinionPayload = {
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
      };

      const generateOpinion = async (correctionIssues?: string[]): Promise<string> => {
        const messages: OpenAIMessage[] = [
          { role: "system", content: UNIFIED_ANALYSIS_PROMPT },
          { role: "user", content: JSON.stringify(opinionPayload) },
        ];
        if (correctionIssues && correctionIssues.length > 0) {
          messages.push({
            role: "user",
            content:
              "이전 의견이 자동 품질검증에서 아래 문제로 미달했습니다. 반드시 교정하여 다시 작성하세요. " +
              "제공된 사실(수치·등급·금액)을 벗어나거나 새 수치를 지어내지 말고, 누락된 치명 위험을 반드시 포함하세요:\n- " +
              correctionIssues.join("\n- "),
          });
        }
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          reasoning_effort: REASONING_ANALYTICAL,
          messages,
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) return "";
        const aiResult = JSON.parse(content);
        return aiResult.opinion || aiResult.aiOpinion || "";
      };

      aiOpinion = await generateOpinion();

      // 품질게이트: 결정적 사실 기준 채점 → 미달 시 판사 지적을 피드백해 1회 재생성
      if (aiOpinion) {
        const groundTruth: QualityGroundTruth = {
          riskGrade: riskScore.gradeLabel,
          safetyScore: riskScore.totalScore,
          mortgageRatio: riskScore.mortgageRatio,
          jeonseRatio: jeonseRatio > 0 ? jeonseRatio : undefined,
          estimatedPriceFormatted: formatKoreanPrice(estimatedPrice),
          criticalFactors: riskScore.factors
            .filter((f) => f.severity === "critical" || f.severity === "high")
            .map((f) => f.description),
          sourceLabels: [
            "등기부등본 파싱",
            "위험도 스코어링",
            ...(marketData?.sale ? ["국토부 매매 실거래가"] : []),
            ...(marketData?.rent ? ["국토부 전세 실거래가"] : []),
            ...(buildingPurpose ? ["건축물대장"] : []),
          ],
        };

        qualityGate = await judgeAnalysisQuality({ opinion: aiOpinion, groundTruth });

        if (qualityGate.status === "judged" && !qualityGate.pass) {
          const regenerated = await generateOpinion(qualityGate.issues);
          if (regenerated) {
            const rejudged = await judgeAnalysisQuality({ opinion: regenerated, groundTruth });
            const newScore = rejudged.status === "judged" ? rejudged.overall : qualityGate.overall;
            // 재생성본이 원본 이상이면 채택, 아니면 원본 유지(경고 플래그로 노출)
            if (newScore >= qualityGate.overall) {
              aiOpinion = regenerated;
              qualityGate = { ...rejudged, regenerated: true };
            } else {
              qualityGate = { ...qualityGate, regenerated: true };
            }
          } else {
            qualityGate = { ...qualityGate, regenerated: true };
          }
        }
      }
    }
  } catch {
    aiOpinion = "AI 의견을 생성할 수 없습니다. API 키를 확인해주세요.";
  }
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
    // priceEstimation.confidence는 0~95(백분율) 스케일 → V-Score는 0~1을 기대하므로 정규화한다.
    priceConfidence: priceEstimation.confidence / 100,
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

  // 분석 근거(citation) — 실제 fetch·계산한 값만 구조화(환각 0)
  const sources = buildAnalysisSources({
    marketData,
    marketDataFiltered,
    buildingPurpose,
    buildYear: parsed.title.buildingDetail || undefined,
    estimatedPrice,
    priceMethod: priceEstimation.method,
    // priceConfidence는 0~1 스케일을 기대(analysis-sources.ts) → 0~95 원값을 정규화(미정규화 시 분석근거에 "신뢰도 3000%" 노출)
    priceConfidence: priceEstimation.confidence / 100,
    // 분석 불가(데이터 미확보) 시 riskScore·vScore 근거를 노출하지 않는다(허위 '안전 100점·A등급' 방지)
    riskScore: rightsAnalyzable ? riskScore : undefined,
    vScore: rightsAnalyzable ? vScore : undefined,
  });

  return {
    propertyInfo,
    riskAnalysis,
    sources,
    parsed,
    validation,
    riskScore,
    marketData,
    marketDataFiltered,
    aiOpinion,
    qualityGate,
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
