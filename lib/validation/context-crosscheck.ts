/**
 * VESTRA 검증 엔진 — A3(문맥/규칙) 검증
 */

import type {
  ParsedRegistry,
  GapguEntry,
  EulguEntry,
} from "../registry-parser";
import type { ValidationIssue } from "../validation-engine";

// ─── A4 크로스체크 re-export (기존 import 경로 유지) ───
export {
  validateSummaryFlags,
  validateEstimatedPriceSanity,
  validateRiskScoreConsistency,
  validateAiOpinionRelevance,
} from "./crosscheck";

// ─── A3. 문맥 및 규칙 검증 ───

/** 등기 날짜 시간순 검증 */
export function validateChronologicalOrder(
  entries: (GapguEntry | EulguEntry)[],
  section: "갑구" | "을구"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dated = entries.filter((e) => e.date && e.date.length === 10);

  for (let i = 1; i < dated.length; i++) {
    if (dated[i].date < dated[i - 1].date) {
      issues.push({
        id: "CTX_CHRONOLOGICAL",
        category: "context",
        severity: "warning",
        field: `${section} ${dated[i].order}번 접수일자`,
        message: `${section} ${dated[i].order}번 항목(${dated[i].date})이 이전 항목(${dated[i - 1].date})보다 앞선 날짜입니다.`,
        expected: `${dated[i - 1].date} 이후`,
        actual: dated[i].date,
      });
    }
  }

  return issues;
}

/** 말소등기 대응 원본 존재 검증 */
export function validateCancellationLogic(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const entry of parsed.eulgu) {
    if (entry.isCancelled && entry.detail) {
      const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
      if (refMatch) {
        const refOrder = parseInt(refMatch[1], 10);
        const original = parsed.eulgu.find((e) => e.order === refOrder);
        if (!original) {
          issues.push({
            id: "CTX_CANCEL_NO_ORIGINAL",
            category: "context",
            severity: "warning",
            field: `을구 ${entry.order}번`,
            message: `을구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본 항목을 찾을 수 없습니다.`,
            expected: `을구 ${refOrder}번 항목 존재`,
            actual: "미발견",
          });
        }
      }
    }
  }

  for (const entry of parsed.gapgu) {
    if (entry.isCancelled && entry.detail) {
      const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
      if (refMatch) {
        const refOrder = parseInt(refMatch[1], 10);
        const originalGapgu = parsed.gapgu.find((e) => e.order === refOrder);
        const originalEulgu = parsed.eulgu.find((e) => e.order === refOrder);
        if (!originalGapgu && !originalEulgu) {
          issues.push({
            id: "CTX_CANCEL_NO_ORIGINAL",
            category: "context",
            severity: "info",
            field: `갑구 ${entry.order}번`,
            message: `갑구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본을 찾을 수 없습니다.`,
          });
        }
      }
    }
  }

  return issues;
}

/** 소유권 체인 일관성 검증 */
export function validateOwnershipChain(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const ownershipEntries = parsed.gapgu
    .filter(
      (e) =>
        (e.purpose === "소유권이전" || e.purpose === "소유권보존") &&
        !e.isCancelled
    )
    .sort((a, b) => a.order - b.order);

  if (ownershipEntries.length === 0 && parsed.gapgu.length > 0) {
    issues.push({
      id: "CTX_NO_OWNER",
      category: "context",
      severity: "error",
      field: "갑구 소유권",
      message: "활성 소유권(보존/이전) 항목이 없습니다. 현재 소유자를 확인할 수 없습니다.",
    });
  }

  return issues;
}

/** 압류 후 근저당 설정 경고 */
export function validateMortgageAfterSeizure(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const seizureDates = parsed.gapgu
    .filter(
      (e) =>
        (e.purpose === "압류" || e.purpose === "가압류") &&
        !e.isCancelled &&
        e.date
    )
    .map((e) => e.date);

  if (seizureDates.length === 0) return issues;

  const earliestSeizure = seizureDates.sort()[0];

  const mortgagesAfterSeizure = parsed.eulgu.filter(
    (e) =>
      /근저당|저당/.test(e.purpose) &&
      !e.isCancelled &&
      e.date &&
      e.date > earliestSeizure
  );

  for (const mortgage of mortgagesAfterSeizure) {
    issues.push({
      id: "CTX_MORTGAGE_AFTER_SEIZURE",
      category: "context",
      severity: "warning",
      field: `을구 ${mortgage.order}번`,
      message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 압류(${earliestSeizure}) 이후에 설정되었습니다. 비정상적 거래 패턴입니다.`,
      expected: `압류(${earliestSeizure}) 이전`,
      actual: mortgage.date,
    });
  }

  return issues;
}

/** 신탁 후 근저당 충돌 검증 */
export function validateTrustMortgageConflict(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const trustEntries = parsed.gapgu.filter(
    (e) => /신탁/.test(e.purpose) && !e.isCancelled && e.date
  );

  if (trustEntries.length === 0) return issues;

  const trustDate = trustEntries[0].date;

  const mortgagesAfterTrust = parsed.eulgu.filter(
    (e) =>
      /근저당|저당/.test(e.purpose) &&
      !e.isCancelled &&
      e.date &&
      e.date > trustDate
  );

  for (const mortgage of mortgagesAfterTrust) {
    issues.push({
      id: "CTX_TRUST_MORTGAGE_CONFLICT",
      category: "context",
      severity: "warning",
      field: `을구 ${mortgage.order}번`,
      message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 신탁등기(${trustDate}) 이후에 설정되었습니다. 수탁자 동의 여부를 확인하세요.`,
      expected: "신탁 이전 또는 수탁자 동의",
      actual: `신탁(${trustDate}) 후 근저당(${mortgage.date})`,
    });
  }

  return issues;
}

/** 갑구 1번 항목 규칙 검증 */
export function validateFirstEntryRule(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (parsed.gapgu.length === 0) return issues;

  const first = parsed.gapgu[0];
  const isValidFirst =
    first.purpose === "소유권보존" || first.purpose === "소유권이전";

  if (!isValidFirst) {
    issues.push({
      id: "CTX_FIRST_ENTRY",
      category: "context",
      severity: "warning",
      field: "갑구 1번",
      message: `갑구 1번 항목이 '${first.purpose}'입니다. 일반적으로 '소유권보존' 또는 '소유권이전'이어야 합니다.`,
      expected: "소유권보존 또는 소유권이전",
      actual: first.purpose,
    });
  }

  return issues;
}

/** 소유권 없이 을구만 있는 경우 검증 */
export function validateEulguWithoutOwnership(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (parsed.eulgu.length === 0) return issues;

  const hasOwnership = parsed.gapgu.some(
    (e) =>
      (e.purpose === "소유권이전" || e.purpose === "소유권보존") &&
      !e.isCancelled
  );

  if (!hasOwnership) {
    issues.push({
      id: "CTX_EULGU_NO_OWNER",
      category: "context",
      severity: "error",
      field: "을구 구조",
      message:
        "활성 소유권 항목이 없는데 을구(권리) 항목이 존재합니다. 등기부 구조가 비정상적입니다.",
    });
  }

  return issues;
}
