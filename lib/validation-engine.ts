/**
 * VESTRA 데이터 검증 엔진
 * ───────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 등기부등본 파싱 결과를 4단계로 검증하여 데이터 신뢰도를 정량 평가.
 *
 * 4단계 검증 체계:
 *  1. 포맷 및 타입 검증 (Format & Type)
 *  2. 합계 및 산술 검증 (Sum & Arithmetic)
 *  3. 문맥 및 규칙 검증 (Context & Rule)
 *  4. 크로스체크 검증 (Cross-Check)
 */

import type { ParsedRegistry } from "./registry-parser";
import type { RiskScore } from "./risk-scoring";

// ─── A1 + A2 ───
import {
  validateDateFormat,
  validateAmountFormat,
  validateEntryOrder,
  validateHolderName,
  validateRiskType,
  validateSectionCompleteness,
  validateMortgageSum,
  validateJeonseSum,
  validateTotalClaims,
  validateMortgageRatio,
  validateActiveEntryCounts,
  validateOwnershipTransferCount,
} from "./validation/format-arithmetic";

// ─── A3 + A4 ───
import {
  validateChronologicalOrder,
  validateCancellationLogic,
  validateOwnershipChain,
  validateMortgageAfterSeizure,
  validateTrustMortgageConflict,
  validateFirstEntryRule,
  validateEulguWithoutOwnership,
  validateSummaryFlags,
  validateEstimatedPriceSanity,
  validateRiskScoreConsistency,
  validateAiOpinionRelevance,
} from "./validation/context-crosscheck";

// ─── 타입 정의 ───

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCategory =
  | "format"
  | "arithmetic"
  | "context"
  | "crosscheck";

export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  field: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  errors: number;
  warnings: number;
  infos: number;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  summary: ValidationSummary;
  timestamp: string;
}

// ─── re-export (기존 import 경로 유지) ───

export {
  validateDateFormat,
  validateAmountFormat,
  validateEntryOrder,
  validateHolderName,
  validateRiskType,
  validateSectionCompleteness,
  validateMortgageSum,
  validateJeonseSum,
  validateTotalClaims,
  validateMortgageRatio,
  validateActiveEntryCounts,
  validateOwnershipTransferCount,
} from "./validation/format-arithmetic";

export { humanField } from "./validation/format-arithmetic";

export {
  validateChronologicalOrder,
  validateCancellationLogic,
  validateOwnershipChain,
  validateMortgageAfterSeizure,
  validateTrustMortgageConflict,
  validateFirstEntryRule,
  validateEulguWithoutOwnership,
  validateSummaryFlags,
  validateEstimatedPriceSanity,
  validateRiskScoreConsistency,
  validateAiOpinionRelevance,
} from "./validation/context-crosscheck";

// ─── 메인 검증 함수 ───

/**
 * 등기부등본 파싱 결과를 4단계로 검증합니다.
 *
 * @param parsed - parseRegistry() 결과
 * @param estimatedPrice - 추정 시세 (선택)
 * @param riskScore - calculateRiskScore() 결과 (선택)
 * @param aiOpinion - AI 종합 의견 (선택)
 * @returns ValidationResult
 */
export function validateParsedRegistry(
  parsed: ParsedRegistry,
  estimatedPrice?: number,
  riskScore?: RiskScore,
  aiOpinion?: string
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let totalChecks = 0;

  // ══════════════════════════════════════
  // A1: 포맷 및 타입 검증
  // ══════════════════════════════════════

  for (const entry of parsed.gapgu) {
    totalChecks++;
    const dateIssue = validateDateFormat(
      entry.date,
      `갑구[${entry.order}].date`
    );
    if (dateIssue) issues.push(dateIssue);

    totalChecks++;
    const holderIssue = validateHolderName(
      entry.holder,
      `갑구[${entry.order}].holder`
    );
    if (holderIssue) issues.push(holderIssue);

    totalChecks++;
    const riskIssue = validateRiskType(
      entry.riskType,
      `갑구[${entry.order}].riskType`
    );
    if (riskIssue) issues.push(riskIssue);
  }

  for (const entry of parsed.eulgu) {
    totalChecks++;
    const dateIssue = validateDateFormat(
      entry.date,
      `을구[${entry.order}].date`
    );
    if (dateIssue) issues.push(dateIssue);

    totalChecks++;
    const amountIssue = validateAmountFormat(
      entry.amount,
      `을구[${entry.order}].amount`
    );
    if (amountIssue) issues.push(amountIssue);

    totalChecks++;
    const holderIssue = validateHolderName(
      entry.holder,
      `을구[${entry.order}].holder`
    );
    if (holderIssue) issues.push(holderIssue);

    totalChecks++;
    const riskIssue = validateRiskType(
      entry.riskType,
      `을구[${entry.order}].riskType`
    );
    if (riskIssue) issues.push(riskIssue);
  }

  totalChecks++;
  issues.push(...validateEntryOrder(parsed.gapgu, "갑구"));
  totalChecks++;
  issues.push(...validateEntryOrder(parsed.eulgu, "을구"));

  totalChecks++;
  issues.push(...validateSectionCompleteness(parsed));

  // ══════════════════════════════════════
  // A2: 합계 및 산술 검증
  // ══════════════════════════════════════

  totalChecks++;
  issues.push(...validateMortgageSum(parsed));

  totalChecks++;
  issues.push(...validateJeonseSum(parsed));

  totalChecks++;
  issues.push(...validateTotalClaims(parsed));

  totalChecks++;
  issues.push(...validateActiveEntryCounts(parsed));

  totalChecks++;
  issues.push(...validateOwnershipTransferCount(parsed));

  if (estimatedPrice && riskScore) {
    totalChecks++;
    issues.push(...validateMortgageRatio(parsed, estimatedPrice, riskScore));
  }

  // ══════════════════════════════════════
  // A3: 문맥 및 규칙 검증
  // ══════════════════════════════════════

  totalChecks++;
  issues.push(...validateChronologicalOrder(parsed.gapgu, "갑구"));

  totalChecks++;
  issues.push(...validateChronologicalOrder(parsed.eulgu, "을구"));

  totalChecks++;
  issues.push(...validateCancellationLogic(parsed));

  totalChecks++;
  issues.push(...validateOwnershipChain(parsed));

  totalChecks++;
  issues.push(...validateMortgageAfterSeizure(parsed));

  totalChecks++;
  issues.push(...validateTrustMortgageConflict(parsed));

  totalChecks++;
  issues.push(...validateFirstEntryRule(parsed));

  totalChecks++;
  issues.push(...validateEulguWithoutOwnership(parsed));

  // ══════════════════════════════════════
  // A4: 크로스체크 검증
  // ══════════════════════════════════════

  totalChecks++;
  issues.push(...validateSummaryFlags(parsed));

  if (estimatedPrice) {
    totalChecks++;
    issues.push(...validateEstimatedPriceSanity(estimatedPrice));
  }

  if (riskScore) {
    totalChecks++;
    issues.push(...validateRiskScoreConsistency(parsed, riskScore));
  }

  if (aiOpinion) {
    totalChecks++;
    issues.push(...validateAiOpinionRelevance(parsed, aiOpinion));
  }

  // ══════════════════════════════════════
  // 결과 집계
  // ══════════════════════════════════════

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;
  const passed = totalChecks - errors - warnings;
  const score =
    totalChecks > 0 ? Math.round((Math.max(0, passed) / totalChecks) * 100) : 100;

  return {
    isValid: errors === 0,
    score,
    issues,
    summary: {
      totalChecks,
      passed: Math.max(0, passed),
      errors,
      warnings,
      infos,
    },
    timestamp: new Date().toISOString(),
  };
}
