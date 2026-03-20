import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { RIGHTS_ANALYSIS_OPINION_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { estimatePrice, type PriceEstimationResult } from "@/lib/price-estimation";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";
import { recordIntegrity } from "@/lib/integrity-recorder";

const formatKoreanPrice = (won: number) => formatKRW(won, "없음");

export async function POST(req: NextRequest) {
  try {
    // 인증 + 역할 기반 제한
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`analyze-rights:${userId || ip}`, 30);
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

    // 1단계: 종합 시세 데이터 조회 (매매 + 전월세)
    let comprehensive = null;
    try {
      comprehensive = await fetchComprehensivePrices(address, 12);
    } catch (e) {
      console.warn("MOLIT API 종합 조회 실패:", e);
    }

    // 2단계: 자체 엔진으로 매매가/전세가 추정
    const priceResult: PriceEstimationResult = estimatePrice(
      { address, aptName: address },
      comprehensive?.sale ?? null,
      comprehensive?.rent ?? null,
    );

    // 3단계: 리스크 분석 (MOLIT 데이터 기반)
    const jeonseRatio = priceResult.jeonseRatio;
    const risks: { level: "danger" | "warning" | "safe"; title: string; description: string }[] = [];

    // 전세가율 리스크
    if (jeonseRatio >= 80) {
      risks.push({ level: "danger", title: "전세가율 위험", description: `전세가율 ${jeonseRatio}%로 깡통전세 위험이 높습니다` });
    } else if (jeonseRatio >= 70) {
      risks.push({ level: "warning", title: "전세가율 주의", description: `전세가율 ${jeonseRatio}%로 주의가 필요합니다` });
    } else if (jeonseRatio > 0) {
      risks.push({ level: "safe", title: "전세가율 안전", description: `전세가율 ${jeonseRatio}%로 안전 범위입니다` });
    }

    // 데이터 신뢰도 리스크
    if (priceResult.confidence < 30) {
      risks.push({ level: "warning", title: "데이터 부족", description: "실거래 데이터가 부족하여 추정치의 정확도가 낮을 수 있습니다" });
    }

    // 가격 변동성 리스크
    if (priceResult.priceRange.stdDev > 0 && priceResult.estimatedPrice > 0) {
      const cv = priceResult.priceRange.stdDev / priceResult.estimatedPrice;
      if (cv > 0.3) {
        risks.push({ level: "warning", title: "가격 변동성 높음", description: "해당 지역 거래가 편차가 커 정확한 시세 판단이 어렵습니다" });
      }
    }

    if (risks.length === 0) {
      risks.push({ level: "safe", title: "특이사항 없음", description: "주소 기반 분석에서 특별한 위험 요소가 발견되지 않았습니다" });
    }

    const safetyScore = Math.max(0, Math.min(100,
      100
      - risks.filter((r) => r.level === "danger").length * 25
      - risks.filter((r) => r.level === "warning").length * 10
    ));

    // 4단계: 구조화된 결과 생성
    const propertyInfo = {
      address,
      type: "아파트",
      area: "",
      buildYear: "",
      estimatedPrice: priceResult.estimatedPrice,
      jeonsePrice: priceResult.estimatedJeonsePrice,
      recentTransaction: comprehensive?.sale?.transactions?.[0]
        ? `${comprehensive.sale.transactions[0].dealYear}.${String(comprehensive.sale.transactions[0].dealMonth).padStart(2, "0")} / ${formatKoreanPrice(comprehensive.sale.transactions[0].dealAmount)}`
        : "",
    };

    const riskAnalysis = {
      jeonseRatio,
      mortgageRatio: 0,
      safetyScore,
      riskScore: 100 - safetyScore,
      risks,
    };

    // 5단계: LLM으로 종합 의견만 생성
    let aiOpinion = "";
    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: RIGHTS_ANALYSIS_OPINION_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              address,
              estimatedPrice: priceResult.estimatedPrice,
              estimatedPriceFormatted: formatKoreanPrice(priceResult.estimatedPrice),
              jeonsePriceFormatted: formatKoreanPrice(priceResult.estimatedJeonsePrice),
              jeonseRatio,
              safetyScore,
              risks,
              confidence: priceResult.confidence,
              comparableCount: priceResult.comparableCount,
              method: priceResult.method,
              recentTransaction: propertyInfo.recentTransaction,
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

    // 무결성 체인 기록 (비동기, 실패해도 결과 반환)
    try {
      const analysisId = `rights_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      recordIntegrity({
        analysisId,
        analysisType: "rights",
        address: propertyInfo?.address,
        steps: [
          { name: "등기부 파싱", input: { address: propertyInfo?.address }, output: { type: propertyInfo?.type } },
          { name: "위험도 분석", input: propertyInfo, output: { score: riskAnalysis?.safetyScore, riskScore: riskAnalysis?.riskScore } },
          { name: "AI 의견 생성", input: { safetyScore: riskAnalysis?.safetyScore }, output: { hasOpinion: !!aiOpinion } },
        ],
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ propertyInfo, riskAnalysis, aiOpinion });
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
