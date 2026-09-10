/**
 * AI 품질게이트 (LLM-as-judge)
 *
 * 결정적 계산값(riskScore·sources·추정가 등 ground truth)을 기준으로
 * AI가 생성한 서술(opinion)을 정확성·근거성·완결성 3축으로 자동 채점한다.
 *
 * 기존 `selfVerify`(규칙기반 수치 대조)를 보완한다:
 *   - selfVerify = 문자열/수치가 계산값과 어긋나는지 결정적으로 검사
 *   - qualityGate = 서술이 계산값과 모순/환각 없는지, 치명 위험을 빠짐없이 다뤘는지 LLM이 채점
 *
 * 판사는 생성보다 기계적이므로 reasoning_effort=minimal로 지연·비용을 억제한다.
 * 판사 자체가 실패해도(네트워크·파싱) 분석을 절대 깨뜨리지 않는다 → status="skipped"로 fail-open.
 *
 * @module lib/ai-quality-gate
 */

import { getOpenAIClient, OPENAI_MODEL, REASONING_MECHANICAL } from "./openai";

/** 채점 기준이 되는 결정적 사실(환각 0). 서술이 이 값들과 어긋나면 감점. */
export interface QualityGroundTruth {
  /** 위험 등급 라벨 (예: "위험", "주의", "안전") */
  riskGrade: string;
  /** 안전도 점수 0~100 */
  safetyScore: number;
  /** 근저당 비율 (%) */
  mortgageRatio: number;
  /** 전세가율 (%). 없으면 undefined */
  jeonseRatio?: number;
  /** 한국어 포맷된 추정가 (예: "1억 1,000만원") */
  estimatedPriceFormatted: string;
  /** critical/high 심각도 위험 설명 목록 — 서술이 이걸 빠뜨리면 완결성 감점 */
  criticalFactors: string[];
  /** 분석 근거(citation) 라벨 목록 — 서술이 실제 근거 기반인지 판단용 */
  sourceLabels: string[];
}

/** 채점 결과 */
export interface QualityJudgment {
  /** 정확성: 계산값과의 사실 정합(모순·환각 없음) 0~100 */
  accuracy: number;
  /** 근거성: 실데이터·출처 기반 서술 정도 0~100 */
  grounding: number;
  /** 완결성: 치명 위험·필수 조언 포함 정도 0~100 */
  completeness: number;
  /** 가중 종합 0~100 (코드에서 결정적으로 재계산, 모델 값 미신뢰) */
  overall: number;
  /** 임계 통과 여부 */
  pass: boolean;
  /** 감점 사유 — 재생성 피드백에 사용 */
  issues: string[];
  /** judged=정상 채점 / skipped=판사 실패로 채점 불가(fail-open) */
  status: "judged" | "skipped";
  /** 임계 미달로 1회 재생성이 수행되었는지 */
  regenerated: boolean;
}

/** 종합 점수 임계값. 미만이면 재생성 트리거. */
export const QUALITY_PASS_THRESHOLD = 70;

/** 정확성 하드 플로어. 유창해도 사실이 틀리면 무조건 미달. */
const ACCURACY_HARD_FLOOR = 60;

/** 축별 가중치 (합 1.0) */
const WEIGHTS = { accuracy: 0.5, grounding: 0.3, completeness: 0.2 } as const;

const JUDGE_SYSTEM_PROMPT = `당신은 대한민국 부동산 권리분석 AI의 출력 품질을 채점하는 엄격한 심사관입니다.

당신에게는 (A) VESTRA 자체 엔진이 결정적으로 계산한 "사실(ground truth)"과 (B) AI가 생성한 "종합 의견(opinion)"이 주어집니다.
opinion을 아래 3개 축으로 각각 0~100점으로 채점하세요. 반드시 사실(A)을 기준으로 판단하고, 당신의 상식으로 사실을 새로 만들지 마세요.

1. accuracy(정확성): opinion의 수치·등급·금액이 사실(A)과 일치하는가. 사실과 모순되거나 A에 없는 수치를 지어내면(환각) 강하게 감점.
2. grounding(근거성): opinion이 제공된 근거(위험요소·출처·실거래)에 기반해 서술되었는가. 근거 없는 단정·일반론 위주면 감점.
3. completeness(완결성): criticalFactors의 치명 위험을 빠짐없이 다루고, 임차인/매수인 관점의 구체적 조언과 추가 확인사항을 포함했는가. 치명 위험 누락은 강하게 감점.

각 축의 감점 사유를 issues에 한국어로 간결히 적으세요(문제 없으면 빈 배열).

반드시 아래 JSON 형식으로만 응답하세요:
{
  "accuracy": <0~100 정수>,
  "grounding": <0~100 정수>,
  "completeness": <0~100 정수>,
  "issues": ["<감점 사유>", ...]
}`;

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** fail-open 판정 결과(판사 실패 시). 분석을 통과시키되 상태로 표시. */
function skipped(): QualityJudgment {
  return {
    accuracy: 0,
    grounding: 0,
    completeness: 0,
    overall: 0,
    pass: true,
    issues: [],
    status: "skipped",
    regenerated: false,
  };
}

/**
 * AI 종합 의견을 결정적 사실 기준으로 채점한다.
 * 판사 호출은 사용자 일일 분석 쿼터를 소모하지 않는 내부 신뢰성 호출이다.
 *
 * @returns 채점 결과. 판사 자체 실패 시 status="skipped"(pass=true)로 fail-open.
 */
export async function judgeAnalysisQuality(params: {
  opinion: string;
  groundTruth: QualityGroundTruth;
}): Promise<QualityJudgment> {
  const { opinion, groundTruth } = params;

  // 채점 대상이 없는 경우(빈 의견·한도초과 폴백 문구 등)는 채점 불가 → skipped
  if (!opinion || opinion.trim().length < 20) {
    return skipped();
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: REASONING_MECHANICAL,
      messages: [
        { role: "system", content: JUDGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            groundTruth: {
              riskGrade: groundTruth.riskGrade,
              safetyScore: groundTruth.safetyScore,
              mortgageRatio: groundTruth.mortgageRatio,
              jeonseRatio: groundTruth.jeonseRatio ?? null,
              estimatedPrice: groundTruth.estimatedPriceFormatted,
              criticalFactors: groundTruth.criticalFactors,
              availableSources: groundTruth.sourceLabels,
            },
            opinion,
          }),
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return skipped();

    const parsed = JSON.parse(content) as {
      accuracy?: unknown;
      grounding?: unknown;
      completeness?: unknown;
      issues?: unknown;
    };

    const accuracy = clampScore(parsed.accuracy);
    const grounding = clampScore(parsed.grounding);
    const completeness = clampScore(parsed.completeness);
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 10)
      : [];

    // 종합은 코드에서 결정적으로 재계산(모델의 overall 미신뢰)
    const overall = Math.round(
      accuracy * WEIGHTS.accuracy + grounding * WEIGHTS.grounding + completeness * WEIGHTS.completeness,
    );

    // 통과 조건: 종합 임계 이상 AND 정확성 하드 플로어 이상
    const pass = overall >= QUALITY_PASS_THRESHOLD && accuracy >= ACCURACY_HARD_FLOOR;

    return { accuracy, grounding, completeness, overall, pass, issues, status: "judged", regenerated: false };
  } catch {
    // 판사 실패는 분석을 깨뜨리지 않는다(fail-open) — 상태로만 표시
    return skipped();
  }
}
