/**
 * VESTRA 계약서 조항 분석 엔진 (Contract Clause Analysis Engine)
 * ──────────────────────────────────────────────────────────────
 * 한국 부동산 계약서를 규칙 기반으로 파싱하여 조항별 리스크 판정.
 * LLM 없이 법령 DB + 패턴 매칭으로 위험 요소 감지.
 *
 * 세부 로직은 lib/contract/ 하위 모듈로 분리됨:
 *  - types: 공용 타입
 *  - clause-analysis: 조항 파싱·리스크·누락 검사
 *  - info-extractor: 핵심정보 추출·병합
 *  - review-issues: 검토 이슈·안전점수
 *  - clause-rules: 규칙 DB·조항 상호작용(특허)
 */

import { CLAUSE_RULES, analyzeClauseInteractions } from "./contract/clause-rules";
import { parseContractSections, analyzeClauseRisk, checkMissingClauses } from "./contract/clause-analysis";
import { extractContractInfo, mergeExtractedInfo } from "./contract/info-extractor";
import { buildReviewIssues, calculateSafetyScore } from "./contract/review-issues";
import type {
  AnalyzedClause,
  ContractExtractedInfo,
  ContractAnalysisResult,
} from "./contract/types";

// ─── re-export (기존 import 경로 유지) ───

export {
  CLAUSE_RULES,
  REQUIRED_CLAUSES,
  CLAUSE_INTERACTION_RULES,
  analyzeClauseInteractions,
} from "./contract/clause-rules";
export type { ClauseRule, RequiredClauseCheck } from "./contract/clause-rules";

export type {
  AnalyzedClause,
  MissingClause,
  ContractPaymentItem,
  ContractPropertyDetail,
  ContractExtractedInfo,
  ContractReviewIssue,
  ContractAnalysisResult,
} from "./contract/types";

export { cleanPartyName, mergeExtractedInfo } from "./contract/info-extractor";
export { calculateSafetyScore } from "./contract/review-issues";

// ─── 메인 분석 함수 ───

export function analyzeContract(
  contractText: string,
  infoOverride?: Partial<ContractExtractedInfo> | null,
): ContractAnalysisResult {
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
  // 정규식 baseline + AI 추출 override 병합 (AI 우선)
  const extractedInfo = mergeExtractedInfo(extractContractInfo(contractText), infoOverride);
  const reviewIssues = buildReviewIssues(contractText, extractedInfo, missingClauses);

  // 조항 상호작용 분석 (특허: 교차 위험 탐지)
  const clauseInteractions = analyzeClauseInteractions(clauses, missingClauses, contractText);

  // 안전점수 계산 (상호작용 감점 포함)
  const safetyScore = calculateSafetyScore(clauses, missingClauses, reviewIssues, clauseInteractions.totalInteractionImpact);

  return { clauses, missingClauses, safetyScore, extractedInfo, reviewIssues, clauseInteractions };
}
