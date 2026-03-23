/**
 * 사업성 분석 LLM 프롬프트 (심사역 페르소나)
 *
 * SCR(서울신용평가) 스타일의 전문적인 검증 의견을 생성하기 위한
 * 시스템 프롬프트 및 장별 의견 요청 프롬프트를 관리합니다.
 *
 * @module lib/feasibility/feasibility-prompts
 */

import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import type {
  MergedProjectContext,
  VerificationResult,
  RationalityItem,
  ChapterOpinion,
  FeasibilityScore,
  RationalityGrade,
} from "./feasibility-types";
import { RATIONALITY_LABELS } from "./feasibility-types";

// ---------------------------------------------------------------------------
// 시스템 프롬프트
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `당신은 서울신용평가(SCR)의 수석 PF 심사역입니다.
제출된 사업 데이터와 공공데이터 교차 검증 결과를 바탕으로 전문적인 검증 의견을 작성합니다.

원칙:
1. 수치의 허점을 지적하고 근거를 제시하라.
2. 모든 의견에 사용된 데이터 출처와 기준일을 명시하라.
3. 낙관적 수치에 대해서는 반드시 리스크를 지적하라.
4. "적정"한 수치에 대해서도 조건과 전제를 명시하라.
5. 전문 용어를 사용하되 핵심 논점이 명확히 전달되도록 하라.
6. 투자 결정에 도움이 되는 구체적이고 실질적인 의견을 제시하라.

응답은 반드시 JSON 형식으로 반환하라.`;

// ---------------------------------------------------------------------------
// 장(Chapter) 구성 정의
// ---------------------------------------------------------------------------

interface ChapterConfig {
  id: string;
  title: string;
  relatedClaims: string[];
  description: string;
}

const CHAPTERS: ChapterConfig[] = [
  {
    id: "I",
    title: "사업 개요",
    relatedClaims: ["total_land_area", "total_floor_area", "floor_area_ratio", "building_coverage", "total_units"],
    description: "위치, 규모, 시설계획 등 사업 개요 전반의 적정성 검토",
  },
  {
    id: "II",
    title: "시장 환경 분석",
    relatedClaims: ["expected_sale_rate"],
    description: "지역 수급현황, 미분양 추이, 인구/가구 변동 등 시장 환경 분석",
  },
  {
    id: "III",
    title: "분양가 적정성 분석",
    relatedClaims: ["planned_sale_price"],
    description: "계획 분양가의 인근 실거래가 대비 적정성 분석",
  },
  {
    id: "IV",
    title: "공사비 및 사업비 분석",
    relatedClaims: ["total_construction_cost", "construction_cost_per_pyeong", "total_project_cost", "land_cost"],
    description: "건설공사비지수 대비 공사비/사업비 합리성 검토",
  },
  {
    id: "V",
    title: "재무 타당성 분석",
    relatedClaims: ["expected_profit_rate", "pf_interest_rate"],
    description: "수익률, PF 금리, 현금흐름 시나리오 분석",
  },
  {
    id: "VI",
    title: "종합 의견",
    relatedClaims: [],
    description: "전체 검증 결과를 종합하여 투자 적격 여부 판단",
  },
];

// ---------------------------------------------------------------------------
// 장별 의견 생성
// ---------------------------------------------------------------------------

function buildChapterPrompt(
  chapter: ChapterConfig,
  context: MergedProjectContext,
  verifications: VerificationResult[],
  rationalityItems: RationalityItem[]
): string {
  // 해당 장과 관련된 검증 결과만 필터
  const relatedVerifications = verifications.filter((v) =>
    chapter.relatedClaims.includes(v.claimKey)
  );
  const relatedRationality = rationalityItems.filter((r) =>
    chapter.relatedClaims.includes(r.claimKey)
  );

  const claimTable = relatedVerifications
    .map((v) => `- ${v.claimLabel}: ${v.claimValue.toLocaleString()}${v.claimUnit}`)
    .join("\n") || "- 해당 데이터 없음";

  const verificationTable = relatedVerifications
    .map(
      (v) =>
        `- ${v.claimLabel}: 업체 ${v.claimValue.toLocaleString()} vs 벤치마크 ${v.benchmark.value.toLocaleString()} (괴리율 ${v.deviationPercent.toFixed(1)}%, 출처: ${v.benchmark.source})`
    )
    .join("\n") || "- 해당 검증 데이터 없음";

  const rationalityTable = relatedRationality
    .map(
      (r) =>
        `- ${r.claimLabel}: ${RATIONALITY_LABELS[r.grade]} (${r.reasoning})`
    )
    .join("\n") || "- 해당 판정 데이터 없음";

  return `다음은 "${context.projectName}" 사업성 분석의 "${chapter.title}" 장입니다.

[사업 기본 정보]
- 위치: ${context.location.address || "미확인"}
- 용도: ${context.purpose}
- 연면적: ${context.scale.totalFloorArea.toLocaleString()}㎡
- 총 세대수: ${context.scale.totalUnits.toLocaleString()}세대

[업체 제출 수치]
${claimTable}

[교차 검증 결과]
${verificationTable}

[합리성 판정]
${rationalityTable}

위 데이터를 바탕으로 SCR 스타일의 검토 의견을 작성하세요.
반드시 구체적 수치를 인용하고 리스크 요인을 지적하세요.

JSON 응답:
{
  "summary": "장 요약 (1-2문장)",
  "overallReview": "장 전체에 대한 종합 검토 의견 (3-5문장)",
  "riskHighlight": true/false
}`;
}

function buildInvestmentOpinionPrompt(
  context: MergedProjectContext,
  rationalityItems: RationalityItem[],
  score: FeasibilityScore
): string {
  const itemsSummary = rationalityItems
    .map(
      (r) =>
        `- ${r.claimLabel}: ${RATIONALITY_LABELS[r.grade]} (괴리율 ${r.deviation.toFixed(1)}%)`
    )
    .join("\n");

  return `다음은 "${context.projectName}" 사업의 전체 검증 결과입니다.

[사업 개요]
- 위치: ${context.location.address || "미확인"}
- 용도: ${context.purpose}
- 종합 점수: ${score.score}점 (${score.gradeLabel})

[항목별 검증 결과]
${itemsSummary}

위 결과를 종합하여 투자 적격 여부에 대한 최종 의견을 작성하세요.
리스크 요인과 투자 시 유의사항을 반드시 포함하세요.

JSON 응답:
{
  "investmentOpinion": "종합 투자 의견 (5-8문장)"
}`;
}

// ---------------------------------------------------------------------------
// LLM 호출
// ---------------------------------------------------------------------------

export async function generateChapterOpinions(
  context: MergedProjectContext,
  verifications: VerificationResult[],
  rationalityItems: RationalityItem[],
  costGuardIp: string,
  vScore?: FeasibilityScore
): Promise<ChapterOpinion[]> {
  let openai: ReturnType<typeof getOpenAIClient> | null = null;
  try {
    openai = getOpenAIClient();
  } catch {
    // OpenAI 클라이언트 초기화 실패 시 폴백 모드로 진행
  }
  const chapters: ChapterOpinion[] = [];

  for (const chapterConfig of CHAPTERS) {
    const relatedVerifications = verifications.filter((v) =>
      chapterConfig.relatedClaims.includes(v.claimKey)
    );
    const relatedRationality = rationalityItems.filter((r) =>
      chapterConfig.relatedClaims.includes(r.claimKey)
    );

    // 데이터 테이블 구성
    const dataTable = relatedVerifications.map((v) => ({
      label: v.claimLabel,
      value: v.claimValue.toLocaleString(),
      unit: v.claimUnit,
    }));

    // 검증 상세
    const verificationDetails = relatedRationality.map((r) => ({
      claim: r.claimLabel,
      evidence: r.verificationSource,
      grade: r.grade as RationalityGrade,
      reasoning: r.reasoning,
    }));

    // 종합 의견 장(VI)은 전체 데이터 사용
    if (chapterConfig.id === "VI") {
      const allDetails = rationalityItems.map((r) => ({
        claim: r.claimLabel,
        evidence: r.verificationSource,
        grade: r.grade as RationalityGrade,
        reasoning: r.reasoning,
      }));

      chapters.push({
        chapterId: chapterConfig.id,
        title: chapterConfig.title,
        summary: "전체 검증 결과 종합",
        dataTable: rationalityItems.map((r) => ({
          label: r.claimLabel,
          value: `${RATIONALITY_LABELS[r.grade]}`,
          unit: `(${r.deviation.toFixed(1)}%)`,
        })),
        verificationDetails: allDetails,
        overallReview: "", // LLM이 채움
        riskHighlight: rationalityItems.some((r) => r.grade === "UNREALISTIC"),
      });
      continue;
    }

    chapters.push({
      chapterId: chapterConfig.id,
      title: chapterConfig.title,
      summary: "",
      dataTable,
      verificationDetails,
      overallReview: "",
      riskHighlight: relatedRationality.some((r) => r.grade === "UNREALISTIC"),
    });
  }

  // LLM 호출로 각 장의 summary와 overallReview 채우기
  // OpenAI 클라이언트가 없으면 폴백 의견으로 반환
  if (!openai) {
    return chapters.map((ch) => ({
      ...ch,
      summary: ch.verificationDetails.length > 0
        ? `${ch.title} 검토 결과, ${ch.verificationDetails.length}개 항목이 분석되었습니다.`
        : `${ch.title}에 대한 직접 검증 데이터가 부족합니다.`,
      overallReview: ch.verificationDetails
        .map((d) => d.reasoning)
        .join(" ") || "수치 기반 분석 결과입니다. AI 의견 생성을 일시적으로 사용할 수 없습니다.",
    }));
  }

  const costGuard = await checkOpenAICostGuard(costGuardIp);
  if (!costGuard.allowed) {
    // 비용 가드 초과 시 기본 의견 사용
    return chapters.map((ch) => ({
      ...ch,
      summary: ch.verificationDetails.length > 0
        ? `${ch.title} 검토 결과, ${ch.verificationDetails.length}개 항목이 분석되었습니다.`
        : `${ch.title}에 대한 직접 검증 데이터가 부족합니다.`,
      overallReview: ch.verificationDetails
        .map((d) => d.reasoning)
        .join(" ") || "해당 장에 대한 상세 의견을 생성할 수 없습니다.",
    }));
  }

  // 각 장에 대해 LLM 의견 생성 (순차 호출로 비용 관리)
  for (const chapter of chapters) {
    const chapterConfig = CHAPTERS.find((c) => c.id === chapter.chapterId)!;
    const prompt = chapterConfig.id === "VI"
      ? buildInvestmentOpinionPrompt(
          context,
          rationalityItems,
          vScore || { score: 0, grade: "C", gradeLabel: "", breakdown: [], investmentOpinion: "" }
        )
      : buildChapterPrompt(chapterConfig, context, verifications, rationalityItems);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (chapterConfig.id === "VI") {
          chapter.overallReview = parsed.investmentOpinion || "";
          chapter.summary = "종합 투자 의견";
        } else {
          chapter.summary = parsed.summary || "";
          chapter.overallReview = parsed.overallReview || "";
          if (parsed.riskHighlight !== undefined) {
            chapter.riskHighlight = parsed.riskHighlight;
          }
        }
      }
    } catch (error) {
      console.error(`LLM opinion generation failed for chapter ${chapter.chapterId}:`, error);
      chapter.summary = `${chapter.title} 검토 결과`;
      chapter.overallReview = chapter.verificationDetails
        .map((d) => d.reasoning)
        .join(" ") || "의견 생성에 실패했습니다.";
    }
  }

  return chapters;
}
