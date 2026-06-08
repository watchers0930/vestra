/**
 * SCR 보고서 AI 서술 분석 생성 모듈
 *
 * GPT-4.1-mini를 활용하여 사업 데이터 기반 전문 분석 문단을 생성.
 * 각 장에 삽입될 9개 분석 항목을 단일 호출로 생성.
 *
 * @module lib/feasibility/scr-ai-narratives
 */

import { getOpenAIClient } from "@/lib/openai";
import type { CalcResults, ExternalApiData } from "./scr-assembler";

// ─── 타입 ───

export interface ScrAiNarratives {
  developerAnalysis: string;
  demographicNarrative: string;
  housingNarrative: string;
  locationNarrative: string;
  priceConclusion: string;
  incomeNarrative: string;
  cashflowNarrative: string;
  scenarioNarrative: string;
  overallConclusion: string;
}

export interface NarrativeContext {
  projectName: string;
  address: string;
  district: string;
  developerName: string;
  constructorName: string;
  totalUnits: number;
  projectType: string;
  calcResults: CalcResults;
  apiData: ExternalApiData;
}

// ─── 프롬프트 구성 ───

function buildNarrativePrompt(ctx: NarrativeContext): string {
  const { calcResults, apiData } = ctx;
  const bi = calcResults.businessIncome;
  const bep = calcResults.bep;
  const dscr = calcResults.dscr;
  const scenario = calcResults.scenarios;

  // 시행사 재무 요약
  const fin = apiData.financials;
  const latestIncome = fin?.incomeStatements?.at(-1);
  const latestBS = fin?.balanceSheets?.at(-1);
  const devRevenue = latestIncome?.revenue ?? 0;
  const devOpProfit = latestIncome?.operatingProfit ?? 0;
  const devOpMargin = devRevenue > 0 ? ((devOpProfit / devRevenue) * 100).toFixed(1) : "N/A";
  const debtRatio = latestBS && latestBS.totalAssets > 0
    ? ((latestBS.totalLiabilities / latestBS.totalAssets) * 100).toFixed(1)
    : "N/A";

  // 인구 요약
  const popTrends = apiData.populationTrends?.trends ?? [];
  const popFirst = popTrends[0];
  const popLast = popTrends.at(-1);
  const popChange = popFirst && popLast
    ? (((popLast.population - popFirst.population) / popFirst.population) * 100).toFixed(1)
    : "N/A";

  // 시나리오 요약
  const baseScenario = scenario.projections.find(p => p.name === "기본" || p.name === "차주안");
  const pessScenario = scenario.projections.find(p => p.name === "비관" || p.name === "시나리오3");

  return `당신은 한국 부동산 PF(프로젝트 파이낸싱) 전문 신용평가사입니다.
아래 사업 데이터를 분석하여 SCR(구조화금융 신용평가) 보고서의 각 장에 들어갈 전문적인 분석 의견을 작성하세요.

각 항목은 3~5문장의 전문적 분석 문단이어야 합니다. 구체적 수치를 인용하고, 리스크와 기회 요인을 균형있게 서술하세요.
"~입니다", "~됩니다" 체로 작성하세요.

## 사업 개요
- 사업명: ${ctx.projectName}
- 소재지: ${ctx.address}
- 시행사: ${ctx.developerName}
- 시공사: ${ctx.constructorName}
- 총세대수: ${ctx.totalUnits}세대
- 용도: ${ctx.projectType}

## 시행사 재무
- 최근 매출: ${devRevenue.toLocaleString()}만원
- 영업이익률: ${devOpMargin}%
- 부채비율: ${debtRatio}%

## 인구·시장
- 인구 변동(5년): ${popChange}%
- 주택보급률: ${apiData.housingSupply?.trends?.at(-1)?.supplyRate ?? "N/A"}%

## 사업수지
- 총수입: ${bi.totalRevenue.toLocaleString()}만원
- 총지출: ${bi.totalCost.toLocaleString()}만원
- 세전이익: ${bi.profitBeforeTax.toLocaleString()}만원 (이익률 ${bi.profitRate.toFixed(1)}%)

## 분양가
- 계획 분양가: ${calcResults.priceForecast.priceComparison.plannedPrice.toLocaleString()}만원/평
- 현재 평균시세: ${calcResults.priceForecast.currentAvgPrice.toLocaleString()}만원/평
- 적정성 평가: ${calcResults.priceForecast.priceComparison.assessment}

## BEP·DSCR
- BEP 분양률(전시설 동일): ${bep.bep1.businessBep.toFixed(1)}%
- DSCR: ${dscr.cumulativeDscr.toFixed(2)}

## 시나리오
- 기본: 이익률 ${baseScenario?.profitRate.toFixed(1) ?? "N/A"}%
- 비관: 이익률 ${pessScenario?.profitRate.toFixed(1) ?? "N/A"}%

아래 JSON 형식으로 정확히 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "developerAnalysis": "시행사 재무 건전성 및 사업 수행 역량에 대한 종합 분석 (3~5문장)",
  "demographicNarrative": "해당 지역 인구·세대 동향 및 주택 수요 기반 분석 (3~5문장)",
  "housingNarrative": "주택시장 수급 현황, 미분양 동향, 가격 추이 종합 분석 (3~5문장)",
  "locationNarrative": "사업지 입지여건 및 개발 호재/위험 요인 분석 (3~5문장)",
  "priceConclusion": "분양가 적정성에 대한 종합 의견 — 비교 분석 결과 포함 (3~5문장)",
  "incomeNarrative": "사업수지 분석 — 수입/지출 구조, 이익률 평가 (3~5문장)",
  "cashflowNarrative": "자금 조달 구조 및 현금흐름 안정성 분석 (3~5문장)",
  "scenarioNarrative": "시나리오·민감도 분석 종합 — 리스크 요인과 대응력 평가 (3~5문장)",
  "overallConclusion": "최종 상환 가능성 종합 의견 — DSCR, BEP, 시나리오 결과를 종합한 결론 (4~6문장)"
}`;
}

// ─── AI 생성 ───

export async function generateAiNarratives(
  ctx: NarrativeContext
): Promise<ScrAiNarratives | null> {
  try {
    const openai = getOpenAIClient();
    const prompt = buildNarrativePrompt(ctx);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "한국 부동산 PF 전문 신용평가사로서 SCR 보고서 분석 의견을 작성합니다. JSON만 출력하세요.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // 필수 필드 검증
    const fields: (keyof ScrAiNarratives)[] = [
      "developerAnalysis",
      "demographicNarrative",
      "housingNarrative",
      "locationNarrative",
      "priceConclusion",
      "incomeNarrative",
      "cashflowNarrative",
      "scenarioNarrative",
      "overallConclusion",
    ];

    const result: Record<string, string> = {};
    for (const field of fields) {
      result[field] = typeof parsed[field] === "string" ? (parsed[field] as string) : "";
    }

    return result as unknown as ScrAiNarratives;
  } catch (error) {
    console.error("[scr-ai-narratives] AI 서술 생성 실패:", error);
    return null;
  }
}
