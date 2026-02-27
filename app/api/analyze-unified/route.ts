import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { UNIFIED_ANALYSIS_PROMPT } from "@/lib/prompts";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { stripHtml, truncateInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (10 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`analyze-unified:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
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
    let marketData = null;
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

    // 추정가 결정: 사용자 입력 > MOLIT 평균가 > 0
    const estimatedPrice =
      userPrice || marketData?.sale?.avgPrice || 0;

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
          marketContext += `\n매매 실거래: 평균 ${(s.avgPrice / 100000000).toFixed(1)}억, ${s.transactionCount}건`;
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

    return NextResponse.json({
      propertyInfo,
      riskAnalysis,
      parsed,
      validation,
      riskScore,
      marketData,
      aiOpinion,
      dataSource: {
        registryParsed: true,
        molitAvailable: !!marketData,
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
