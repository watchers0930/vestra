/**
 * VESTRA 계약서 분석 — 조항 파싱 & 리스크/누락 검사
 * ──────────────────────────────────────────────────────────────
 * 계약서 텍스트를 조항 단위로 분리하고, 규칙 DB로 조항별 리스크와
 * 필수 조항 누락을 판정한다. contract-analyzer에서 추출(동작 변경 없음).
 */

import { CLAUSE_RULES, REQUIRED_CLAUSES } from "./clause-rules";
import type { AnalyzedClause, MissingClause, ParsedSection } from "./types";

/** 계약서 텍스트를 조항 단위로 분리 */
export function parseContractSections(text: string): ParsedSection[] {
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

/** 파싱된 조항에 리스크 규칙 적용 */
export function analyzeClauseRisk(section: ParsedSection): AnalyzedClause | null {
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
export function checkMissingClauses(fullText: string): MissingClause[] {
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
