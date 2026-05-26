/**
 * VESTRA 맞춤 특약 추천 엔진
 * ─────────────────────────────
 * 계약서 분석 결과(위험 조항 + 누락 조항)와 안전점수를 기반으로
 * 해당 매물에 필요한 특약 문구를 자동 추천.
 */

import type { AnalyzedClause, MissingClause } from "./contract-analyzer";
import { SPECIAL_TERM_TEMPLATES, type SpecialTermTemplate } from "./special-terms-templates";

// ─── 타입 ───

export interface RecommendedTerm {
  template: SpecialTermTemplate;
  matchedTriggers: string[];
  rationale: string;
}

export interface RecommendedTermsResult {
  riskLevel: "critical" | "warning" | "safe";
  terms: RecommendedTerm[];
}

// ─── 우선순위 가중치 ───

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

// ─── 추천 엔진 ───

export function recommendSpecialTerms(
  clauses: AnalyzedClause[],
  missingClauses: MissingClause[],
  safetyScore: number,
): RecommendedTermsResult {
  const matched: RecommendedTerm[] = [];
  const usedIds = new Set<string>();

  const missingTitles = new Set(missingClauses.map((mc) => mc.title));
  const riskClauseTitles = clauses
    .filter((c) => c.riskLevel === "high" || c.riskLevel === "warning")
    .map((c) => {
      // 조항 제목에서 "제N조 (XXX)" 패턴의 내용 부분만 추출
      const m = c.title.match(/\(([^)]+)\)/);
      return m ? m[1] : c.title;
    });

  for (const tpl of SPECIAL_TERM_TEMPLATES) {
    if (usedIds.has(tpl.id)) continue;

    const triggers: string[] = [];

    // 1) 누락 조항 매칭
    if (tpl.triggers.missingClauses) {
      for (const mc of tpl.triggers.missingClauses) {
        if (missingTitles.has(mc)) {
          triggers.push(`누락: ${mc}`);
        }
      }
    }

    // 2) 위험 조항 매칭
    if (tpl.triggers.riskClauses) {
      for (const rc of tpl.triggers.riskClauses) {
        if (riskClauseTitles.some((t) => t.includes(rc) || rc.includes(t))) {
          triggers.push(`위험: ${rc} 조항`);
        }
      }
    }

    // 3) 안전점수 기반 매칭
    if (tpl.triggers.minSafetyScore !== undefined && safetyScore < tpl.triggers.minSafetyScore) {
      triggers.push(`안전점수 ${safetyScore}점 (기준 ${tpl.triggers.minSafetyScore}점 미만)`);
    }

    if (triggers.length > 0) {
      usedIds.add(tpl.id);
      matched.push({
        template: tpl,
        matchedTriggers: triggers,
        rationale: tpl.rationale,
      });
    }
  }

  // 우선순위 정렬: critical → high → medium
  matched.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.template.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.template.priority] ?? 9;
    return pa - pb;
  });

  // 전체 위험 수준 결정
  const hasCritical = matched.some((t) => t.template.priority === "critical");
  const hasHigh = matched.some((t) => t.template.priority === "high");
  const riskLevel: RecommendedTermsResult["riskLevel"] = hasCritical
    ? "critical"
    : hasHigh
      ? "warning"
      : "safe";

  return { riskLevel, terms: matched };
}
