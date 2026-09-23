/**
 * 계약서 심층 분석 AI (조항별 분석 · 누락조항 · 맞춤특약)
 *
 * 규칙 기반 엔진(패턴 매칭)은 표준 문구 위주라 계약서마다 거의 동일한
 * 일반 권고가 나온다. LLM으로 계약서 실제 내용에 맞춘 조항 분석·누락조항·
 * 특약을 생성해 규칙 결과를 대체(실패 시 규칙 폴백)한다.
 *
 * 안전점수 V-Score 수식·조항 상호작용은 특허 영역이라 규칙 계산을 유지하되,
 * 화면 일관성을 위해 AI 조항으로 동일 수식을 재계산한다(수식 불변).
 *
 * @module lib/contract-clauses-ai
 */

import { getOpenAIClient, OPENAI_MODEL, REASONING_ANALYTICAL } from "@/lib/openai";
import { CONTRACT_DEEP_ANALYSIS_PROMPT } from "@/lib/prompts";
import type { AnalyzedClause, MissingClause } from "@/lib/contract-analyzer";
import type { RecommendedTermsResult, RecommendedTerm } from "@/lib/special-terms-recommender";

const MAX_INPUT_CHARS = 14000;

export interface DeepAnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  recommendedTerms: RecommendedTermsResult;
  aiOpinion: string;
}

type RiskLevel = AnalyzedClause["riskLevel"];
type Importance = MissingClause["importance"];
type Priority = "critical" | "high" | "medium";
type Category = "보증금" | "임차인" | "임대인" | "등기" | "기타";

function str(v: unknown, max = 4000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function riskOf(v: unknown): RiskLevel {
  return v === "high" || v === "safe" ? v : "warning";
}

function importanceOf(v: unknown): Importance {
  return v === "high" ? "high" : "medium";
}

function priorityOf(v: unknown): Priority {
  return v === "critical" || v === "high" ? v : "medium";
}

function categoryOf(v: unknown): Category {
  return v === "보증금" || v === "임차인" || v === "임대인" || v === "등기" ? v : "기타";
}

function coerceClauses(v: unknown): AnalyzedClause[] {
  if (!Array.isArray(v)) return [];
  const out: AnalyzedClause[] = [];
  for (const raw of v.slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = str(r.title, 120);
    if (!title) continue;
    out.push({
      title,
      content: str(r.content, 2000),
      riskLevel: riskOf(r.riskLevel),
      analysis: str(r.analysis),
      relatedLaw: str(r.relatedLaw, 300),
    });
  }
  return out;
}

function coerceMissing(v: unknown): MissingClause[] {
  if (!Array.isArray(v)) return [];
  const out: MissingClause[] = [];
  for (const raw of v.slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = str(r.title, 120);
    if (!title) continue;
    out.push({ title, importance: importanceOf(r.importance), description: str(r.description, 1000) });
  }
  return out;
}

function coerceTerms(v: unknown): RecommendedTermsResult {
  const terms: RecommendedTerm[] = [];
  if (Array.isArray(v)) {
    v.slice(0, 12).forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const r = raw as Record<string, unknown>;
      const title = str(r.title, 120);
      const template = str(r.text ?? r.template, 2000);
      if (!title || !template) return;
      const priority = priorityOf(r.priority);
      const rationale = str(r.rationale, 800);
      terms.push({
        template: {
          id: `ai-term-${i}`,
          title,
          category: categoryOf(r.category),
          priority,
          template,
          triggers: {},
          rationale,
        },
        matchedTriggers: [],
        rationale,
      });
    });
  }
  const hasCritical = terms.some((t) => t.template.priority === "critical");
  const hasHigh = terms.some((t) => t.template.priority === "high");
  const riskLevel: RecommendedTermsResult["riskLevel"] = hasCritical
    ? "critical"
    : hasHigh
      ? "warning"
      : "safe";
  return { riskLevel, terms };
}

export function coerceDeepAnalysis(raw: unknown): DeepAnalysisResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    clauses: coerceClauses(r.clauses),
    missingClauses: coerceMissing(r.missingClauses),
    recommendedTerms: coerceTerms(r.recommendedTerms),
    aiOpinion: str(r.aiOpinion, 6000),
  };
}

/**
 * 계약서 심층 분석(조항·누락·특약·종합의견). 실패/빈 결과 시 null(규칙 폴백).
 * @param extraContext 판례·정책 등 의견 보강용 컨텍스트(선택)
 */
export async function analyzeContractDeepAI(
  text: string,
  extraContext?: string,
): Promise<DeepAnalysisResult | null> {
  try {
    const openai = getOpenAIClient();
    const userContent =
      text.slice(0, MAX_INPUT_CHARS) +
      (extraContext ? `\n\n[참고 컨텍스트]${extraContext.slice(0, 3000)}` : "");
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: CONTRACT_DEEP_ANALYSIS_PROMPT },
        { role: "user", content: userContent },
      ],
      reasoning_effort: REASONING_ANALYTICAL,
      max_completion_tokens: 9000,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = coerceDeepAnalysis(JSON.parse(content));
    // 조항이 하나도 안 나오면 신뢰 불가 → 규칙 폴백
    if (parsed.clauses.length === 0) return null;
    return parsed;
  } catch (error) {
    console.warn("[계약 심층분석 AI] 실패, 규칙 폴백:", error);
    return null;
  }
}
