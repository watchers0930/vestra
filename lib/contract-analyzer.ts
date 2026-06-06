/**
 * VESTRA 계약서 조항 분석 엔진 (Contract Clause Analysis Engine)
 * ──────────────────────────────────────────────────────────────
 * 한국 부동산 계약서를 규칙 기반으로 파싱하여 조항별 리스크 판정.
 * LLM 없이 법령 DB + 패턴 매칭으로 위험 요소 감지.
 */

import type { ClauseInteractionResult } from "./patent-types";
import { CLAUSE_RULES, REQUIRED_CLAUSES, analyzeClauseInteractions } from "./contract/clause-rules";

// ─── re-export (기존 import 경로 유지) ───

export { CLAUSE_RULES, REQUIRED_CLAUSES, CLAUSE_INTERACTION_RULES, analyzeClauseInteractions } from "./contract/clause-rules";
export type { ClauseRule, RequiredClauseCheck } from "./contract/clause-rules";

// ─── 타입 정의 ───

export interface AnalyzedClause {
  title: string;
  content: string;
  riskLevel: "high" | "warning" | "safe";
  analysis: string;
  relatedLaw: string;
}

export interface MissingClause {
  title: string;
  importance: "high" | "medium";
  description: string;
}

export interface ContractAnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  clauseInteractions?: ClauseInteractionResult;
}

interface ParsedSection {
  title: string;
  content: string;
  rawText: string;
}

// ─── 조항 파싱 ───

/** 계약서 텍스트를 조항 단위로 분리 */
function parseContractSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // 제N조 패턴으로 분리
  const clausePattern = /제\s*(\d+)\s*조\s*[\(（]([^)）]+)[\)）]/g;
  const matches: { index: number; title: string; num: number }[] = [];

  let match;
  while ((match = clausePattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      title: match[2].trim(),
      num: parseInt(match[1]),
    });
  }

  // 각 조항의 내용 추출
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawText = text.slice(start, end).trim();
    const content = rawText.replace(/^제\s*\d+\s*조\s*[\(（][^)）]+[\)）]\s*/, "").trim();
    sections.push({
      title: `제${matches[i].num}조 (${matches[i].title})`,
      content,
      rawText,
    });
  }

  // 제N조 패턴이 없는 경우 섹션 헤더로 분리 시도
  if (sections.length === 0) {
    const headerPattern = /\[([^\]]+)\]|【([^】]+)】/g;
    const headers: { index: number; title: string }[] = [];

    while ((match = headerPattern.exec(text)) !== null) {
      headers.push({ index: match.index, title: (match[1] || match[2]).trim() });
    }

    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      const rawText = text.slice(start, end).trim();
      const content = rawText.replace(/^\[[^\]]+\]\s*|^【[^】]+】\s*/, "").trim();
      if (content.length > 10) {
        sections.push({ title: headers[i].title, content, rawText });
      }
    }
  }

  return sections;
}

// ─── 분석 로직 ───

/** 파싱된 조항에 리스크 규칙 적용 */
function analyzeClauseRisk(section: ParsedSection): AnalyzedClause | null {
  const fullText = section.rawText;

  for (const rule of CLAUSE_RULES) {
    const matches = rule.detectPatterns.some((p) => p.test(fullText));
    if (matches) {
      const { riskLevel, analysis } = rule.analyzeRisk(fullText);
      return {
        title: section.title,
        content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
        riskLevel,
        analysis,
        relatedLaw: rule.relatedLaw,
      };
    }
  }

  // 매칭되지 않는 조항은 기본 safe
  return {
    title: section.title,
    content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
    riskLevel: "safe",
    analysis: "표준적인 계약 조항입니다",
    relatedLaw: "민법 제618조~제654조 (임대차)",
  };
}

/** 누락 조항 검사 */
function checkMissingClauses(fullText: string): MissingClause[] {
  const missing: MissingClause[] = [];

  for (const check of REQUIRED_CLAUSES) {
    const found = check.detectPatterns.some((p) => p.test(fullText));
    if (!found) {
      missing.push({
        title: check.title,
        importance: check.importance,
        description: check.description,
      });
    }
  }

  return missing;
}

/** 안전점수 계산 (조항 상호작용 감점 포함) */
function calculateSafetyScore(
  clauses: AnalyzedClause[],
  missingClauses: MissingClause[],
  interactionImpact: number = 0,
): number {
  let score = 100;

  for (const clause of clauses) {
    if (clause.riskLevel === "high") score -= 15;
    else if (clause.riskLevel === "warning") score -= 5;
  }

  for (const mc of missingClauses) {
    if (mc.importance === "high") score -= 5;
    else score -= 2;
  }

  // 조항 상호작용에 의한 비선형 추가 감점
  score -= interactionImpact;

  return Math.max(0, Math.min(100, score));
}

// ─── 메인 분석 함수 ───

export function analyzeContract(contractText: string): ContractAnalysisResult {
  // 조항 파싱
  const sections = parseContractSections(contractText);

  // 조항별 리스크 분석
  const clauses: AnalyzedClause[] = [];
  for (const section of sections) {
    const analyzed = analyzeClauseRisk(section);
    if (analyzed) {
      clauses.push(analyzed);
    }
  }

  // 전체 텍스트에서 규칙 매칭 (파싱 실패한 내용도 포함)
  if (clauses.length === 0) {
    // 조항이 하나도 파싱되지 않은 경우, 전체 텍스트를 하나의 조항으로 분석
    for (const rule of CLAUSE_RULES) {
      const matches = rule.detectPatterns.some((p) => p.test(contractText));
      if (matches) {
        const { riskLevel, analysis } = rule.analyzeRisk(contractText);
        clauses.push({
          title: rule.title,
          content: contractText.slice(0, 200) + (contractText.length > 200 ? "..." : ""),
          riskLevel,
          analysis,
          relatedLaw: rule.relatedLaw,
        });
      }
    }
  }

  // 누락 조항 검사
  const missingClauses = checkMissingClauses(contractText);

  // 조항 상호작용 분석 (특허: 교차 위험 탐지)
  const clauseInteractions = analyzeClauseInteractions(clauses, missingClauses, contractText);

  // 안전점수 계산 (상호작용 감점 포함)
  const safetyScore = calculateSafetyScore(clauses, missingClauses, clauseInteractions.totalInteractionImpact);

  return { clauses, missingClauses, safetyScore, clauseInteractions };
}
