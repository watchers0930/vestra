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

import type {
  ParsedRegistry,
  GapguEntry,
  EulguEntry,
  RiskType,
  ParseSummary,
} from "./registry-parser";
import type { RiskScore } from "./risk-scoring";

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

// ─── 상수 ───

const VALID_RISK_TYPES: RiskType[] = ["danger", "warning", "safe", "info"];
const MIN_REASONABLE_PRICE = 50_000_000; // 5천만원
const MAX_REASONABLE_PRICE = 50_000_000_000; // 500억원
const MIN_REASONABLE_AMOUNT = 1_000_000; // 100만원
const MAX_REASONABLE_AMOUNT = 50_000_000_000; // 500억원
const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 2035;

// ─── A1. 포맷 및 타입 검증 ───

/** 날짜 형식 검증 (YYYY.MM.DD, 합리적 범위) */
function validateDateFormat(
  date: string,
  field: string
): ValidationIssue | null {
  if (!date || date === "") {
    return {
      id: "FMT_DATE_EMPTY",
      category: "format",
      severity: "warning",
      field,
      message: `${field}: 날짜가 비어 있습니다.`,
      expected: "YYYY.MM.DD 형식",
      actual: "(빈 값)",
    };
  }

  const m = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) {
    return {
      id: "FMT_DATE_PATTERN",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 날짜 형식이 올바르지 않습니다.`,
      expected: "YYYY.MM.DD",
      actual: date,
    };
  }

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);

  if (year < MIN_DATE_YEAR || year > MAX_DATE_YEAR) {
    return {
      id: "FMT_DATE_YEAR",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 연도(${year})가 합리적 범위(${MIN_DATE_YEAR}~${MAX_DATE_YEAR}) 밖입니다.`,
      expected: `${MIN_DATE_YEAR}~${MAX_DATE_YEAR}`,
      actual: String(year),
    };
  }

  if (month < 1 || month > 12) {
    return {
      id: "FMT_DATE_MONTH",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 월(${month})이 유효하지 않습니다.`,
      expected: "01~12",
      actual: String(month),
    };
  }

  if (day < 1 || day > 31) {
    return {
      id: "FMT_DATE_DAY",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 일(${day})이 유효하지 않습니다.`,
      expected: "01~31",
      actual: String(day),
    };
  }

  return null;
}

/** 금액 형식 검증 (양수, 합리적 범위) */
function validateAmountFormat(
  amount: number,
  field: string
): ValidationIssue | null {
  if (amount === 0) return null; // 0은 미설정으로 허용

  if (amount < 0) {
    return {
      id: "FMT_AMOUNT_NEGATIVE",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 금액이 음수(${amount.toLocaleString()}원)입니다.`,
      expected: "0 이상",
      actual: String(amount),
    };
  }

  if (amount > 0 && amount < MIN_REASONABLE_AMOUNT) {
    return {
      id: "FMT_AMOUNT_TOO_LOW",
      category: "format",
      severity: "warning",
      field,
      message: `${field}: 금액(${amount.toLocaleString()}원)이 부동산 등기로서 비정상적으로 낮습니다.`,
      expected: `${MIN_REASONABLE_AMOUNT.toLocaleString()}원 이상`,
      actual: `${amount.toLocaleString()}원`,
    };
  }

  if (amount > MAX_REASONABLE_AMOUNT) {
    return {
      id: "FMT_AMOUNT_TOO_HIGH",
      category: "format",
      severity: "warning",
      field,
      message: `${field}: 금액(${(amount / 100_000_000).toFixed(1)}억원)이 비정상적으로 높습니다.`,
      expected: `${(MAX_REASONABLE_AMOUNT / 100_000_000).toFixed(0)}억원 이하`,
      actual: `${(amount / 100_000_000).toFixed(1)}억원`,
    };
  }

  return null;
}

/** 순위번호 순차 검증 */
function validateEntryOrder(
  entries: (GapguEntry | EulguEntry)[],
  section: "갑구" | "을구"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (entries.length === 0) return issues;

  const orders = entries.map((e) => e.order);

  // 중복 순위번호 검사
  const seen = new Set<number>();
  for (const order of orders) {
    if (seen.has(order)) {
      issues.push({
        id: "FMT_ORDER_DUPLICATE",
        category: "format",
        severity: "warning",
        field: `${section}.order`,
        message: `${section}: 순위번호 ${order}이(가) 중복됩니다.`,
        expected: "고유한 순위번호",
        actual: `${order} (중복)`,
      });
    }
    seen.add(order);
  }

  // 음수 또는 0 순위번호
  for (const order of orders) {
    if (order <= 0) {
      issues.push({
        id: "FMT_ORDER_INVALID",
        category: "format",
        severity: "error",
        field: `${section}.order`,
        message: `${section}: 순위번호(${order})가 유효하지 않습니다.`,
        expected: "1 이상 양수",
        actual: String(order),
      });
    }
  }

  return issues;
}

/** 권리자명 검증 */
function validateHolderName(
  holder: string,
  field: string
): ValidationIssue | null {
  if (!holder || holder === "") {
    return {
      id: "FMT_HOLDER_EMPTY",
      category: "format",
      severity: "info",
      field,
      message: `${field}: 권리자명이 추출되지 않았습니다.`,
    };
  }

  if (holder.length < 2) {
    return {
      id: "FMT_HOLDER_SHORT",
      category: "format",
      severity: "warning",
      field,
      message: `${field}: 권리자명(${holder})이 너무 짧습니다.`,
      expected: "2자 이상",
      actual: `${holder.length}자`,
    };
  }

  if (holder.length > 30) {
    return {
      id: "FMT_HOLDER_LONG",
      category: "format",
      severity: "warning",
      field,
      message: `${field}: 권리자명이 비정상적으로 깁니다 (${holder.length}자).`,
      expected: "30자 이내",
      actual: `${holder.length}자`,
    };
  }

  return null;
}

/** 위험유형 열거값 검증 */
function validateRiskType(
  riskType: RiskType,
  field: string
): ValidationIssue | null {
  if (!VALID_RISK_TYPES.includes(riskType)) {
    return {
      id: "FMT_RISKTYPE_INVALID",
      category: "format",
      severity: "error",
      field,
      message: `${field}: 위험유형(${riskType})이 유효하지 않습니다.`,
      expected: VALID_RISK_TYPES.join(" | "),
      actual: String(riskType),
    };
  }
  return null;
}

/** 섹션 완전성 검증 */
function validateSectionCompleteness(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 표제부 주소 필수
  if (!parsed.title.address || parsed.title.address.trim() === "") {
    issues.push({
      id: "FMT_SECTION_NO_ADDRESS",
      category: "format",
      severity: "warning",
      field: "title.address",
      message: "표제부에서 소재지 주소를 추출하지 못했습니다.",
    });
  }

  // 갑구가 비어있는 경우
  if (parsed.gapgu.length === 0) {
    issues.push({
      id: "FMT_SECTION_NO_GAPGU",
      category: "format",
      severity: "warning",
      field: "gapgu",
      message: "갑구(소유권) 항목이 없습니다. 파싱이 실패했을 수 있습니다.",
    });
  }

  return issues;
}

// ─── A2. 합계 및 산술 검증 ───

/** 근저당 합계 재계산 검증 */
function validateMortgageSum(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalculated = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && !e.isCancelled)
    .reduce((sum, e) => sum + e.amount, 0);

  if (recalculated !== parsed.summary.totalMortgageAmount) {
    issues.push({
      id: "ARITH_MORTGAGE_SUM",
      category: "arithmetic",
      severity: "error",
      field: "summary.totalMortgageAmount",
      message: `근저당 합계 불일치: 요약값(${parsed.summary.totalMortgageAmount.toLocaleString()}) ≠ 재계산값(${recalculated.toLocaleString()})`,
      expected: recalculated.toLocaleString(),
      actual: parsed.summary.totalMortgageAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 전세권 합계 재계산 검증 */
function validateJeonseSum(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalculated = parsed.eulgu
    .filter((e) => /전세권/.test(e.purpose) && !e.isCancelled)
    .reduce((sum, e) => sum + e.amount, 0);

  if (recalculated !== parsed.summary.totalJeonseAmount) {
    issues.push({
      id: "ARITH_JEONSE_SUM",
      category: "arithmetic",
      severity: "error",
      field: "summary.totalJeonseAmount",
      message: `전세권 합계 불일치: 요약값(${parsed.summary.totalJeonseAmount.toLocaleString()}) ≠ 재계산값(${recalculated.toLocaleString()})`,
      expected: recalculated.toLocaleString(),
      actual: parsed.summary.totalJeonseAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 총채권액 = 근저당 + 전세 검증 */
function validateTotalClaims(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected =
    parsed.summary.totalMortgageAmount + parsed.summary.totalJeonseAmount;

  if (parsed.summary.totalClaimsAmount !== expected) {
    issues.push({
      id: "ARITH_TOTAL_CLAIMS",
      category: "arithmetic",
      severity: "error",
      field: "summary.totalClaimsAmount",
      message: `총채권액 불일치: 요약값(${parsed.summary.totalClaimsAmount.toLocaleString()}) ≠ 근저당(${parsed.summary.totalMortgageAmount.toLocaleString()}) + 전세(${parsed.summary.totalJeonseAmount.toLocaleString()})`,
      expected: expected.toLocaleString(),
      actual: parsed.summary.totalClaimsAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 근저당비율 재계산 교차검증 */
function validateMortgageRatio(
  parsed: ParsedRegistry,
  estimatedPrice: number,
  riskScore?: RiskScore
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!estimatedPrice || estimatedPrice <= 0 || !riskScore) return issues;

  const recalcRatio =
    (parsed.summary.totalMortgageAmount / estimatedPrice) * 100;
  const diff = Math.abs(recalcRatio - riskScore.mortgageRatio);

  if (diff > 0.1) {
    issues.push({
      id: "ARITH_MORTGAGE_RATIO",
      category: "arithmetic",
      severity: "warning",
      field: "riskScore.mortgageRatio",
      message: `근저당비율 불일치: 스코어링값(${riskScore.mortgageRatio.toFixed(1)}%) ≠ 재계산값(${recalcRatio.toFixed(1)}%)`,
      expected: `${recalcRatio.toFixed(1)}%`,
      actual: `${riskScore.mortgageRatio.toFixed(1)}%`,
    });
  }

  return issues;
}

/** 활성 건수 재계산 검증 */
function validateActiveEntryCounts(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 갑구 활성건수
  const recalcActiveGapgu = parsed.gapgu.filter((e) => !e.isCancelled).length;
  if (recalcActiveGapgu !== parsed.summary.activeGapguEntries) {
    issues.push({
      id: "ARITH_ACTIVE_GAPGU",
      category: "arithmetic",
      severity: "error",
      field: "summary.activeGapguEntries",
      message: `갑구 활성건수 불일치: 요약값(${parsed.summary.activeGapguEntries}) ≠ 재계산값(${recalcActiveGapgu})`,
      expected: String(recalcActiveGapgu),
      actual: String(parsed.summary.activeGapguEntries),
    });
  }

  // 을구 활성건수
  const recalcActiveEulgu = parsed.eulgu.filter((e) => !e.isCancelled).length;
  if (recalcActiveEulgu !== parsed.summary.activeEulguEntries) {
    issues.push({
      id: "ARITH_ACTIVE_EULGU",
      category: "arithmetic",
      severity: "error",
      field: "summary.activeEulguEntries",
      message: `을구 활성건수 불일치: 요약값(${parsed.summary.activeEulguEntries}) ≠ 재계산값(${recalcActiveEulgu})`,
      expected: String(recalcActiveEulgu),
      actual: String(parsed.summary.activeEulguEntries),
    });
  }

  // 전체건수 = 갑구.length + 을구.length
  if (parsed.summary.totalGapguEntries !== parsed.gapgu.length) {
    issues.push({
      id: "ARITH_TOTAL_GAPGU",
      category: "arithmetic",
      severity: "error",
      field: "summary.totalGapguEntries",
      message: `갑구 전체건수 불일치: 요약값(${parsed.summary.totalGapguEntries}) ≠ 배열길이(${parsed.gapgu.length})`,
      expected: String(parsed.gapgu.length),
      actual: String(parsed.summary.totalGapguEntries),
    });
  }

  if (parsed.summary.totalEulguEntries !== parsed.eulgu.length) {
    issues.push({
      id: "ARITH_TOTAL_EULGU",
      category: "arithmetic",
      severity: "error",
      field: "summary.totalEulguEntries",
      message: `을구 전체건수 불일치: 요약값(${parsed.summary.totalEulguEntries}) ≠ 배열길이(${parsed.eulgu.length})`,
      expected: String(parsed.eulgu.length),
      actual: String(parsed.summary.totalEulguEntries),
    });
  }

  return issues;
}

/** 소유권이전 횟수 재계산 검증 */
function validateOwnershipTransferCount(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalculated = parsed.gapgu.filter(
    (e) => e.purpose === "소유권이전" && !e.isCancelled
  ).length;

  if (recalculated !== parsed.summary.ownershipTransferCount) {
    issues.push({
      id: "ARITH_OWNERSHIP_COUNT",
      category: "arithmetic",
      severity: "error",
      field: "summary.ownershipTransferCount",
      message: `소유권이전 횟수 불일치: 요약값(${parsed.summary.ownershipTransferCount}) ≠ 재계산값(${recalculated})`,
      expected: String(recalculated),
      actual: String(parsed.summary.ownershipTransferCount),
    });
  }

  return issues;
}

// ─── A3. 문맥 및 규칙 검증 ───

/** 등기 날짜 시간순 검증 */
function validateChronologicalOrder(
  entries: (GapguEntry | EulguEntry)[],
  section: "갑구" | "을구"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dated = entries.filter((e) => e.date && e.date.length === 10);

  for (let i = 1; i < dated.length; i++) {
    // 같은 날짜도 허용 (같은 날 접수 가능)
    if (dated[i].date < dated[i - 1].date) {
      issues.push({
        id: "CTX_CHRONOLOGICAL",
        category: "context",
        severity: "warning",
        field: `${section}[${dated[i].order}].date`,
        message: `${section} ${dated[i].order}번 항목(${dated[i].date})이 이전 항목(${dated[i - 1].date})보다 앞선 날짜입니다.`,
        expected: `${dated[i - 1].date} 이후`,
        actual: dated[i].date,
      });
    }
  }

  return issues;
}

/** 말소등기 대응 원본 존재 검증 */
function validateCancellationLogic(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 을구에서 말소 항목 확인
  for (const entry of parsed.eulgu) {
    if (entry.isCancelled && entry.detail) {
      // "1번근저당권말소" 패턴에서 원본 순위번호 추출
      const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
      if (refMatch) {
        const refOrder = parseInt(refMatch[1], 10);
        const original = parsed.eulgu.find((e) => e.order === refOrder);
        if (!original) {
          issues.push({
            id: "CTX_CANCEL_NO_ORIGINAL",
            category: "context",
            severity: "warning",
            field: `을구[${entry.order}]`,
            message: `을구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본 항목을 찾을 수 없습니다.`,
            expected: `을구 ${refOrder}번 항목 존재`,
            actual: "미발견",
          });
        }
      }
    }
  }

  // 갑구에서도 동일
  for (const entry of parsed.gapgu) {
    if (entry.isCancelled && entry.detail) {
      const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
      if (refMatch) {
        const refOrder = parseInt(refMatch[1], 10);
        // 갑구 말소는 자체 내 또는 을구 참조 가능
        const originalGapgu = parsed.gapgu.find((e) => e.order === refOrder);
        const originalEulgu = parsed.eulgu.find((e) => e.order === refOrder);
        if (!originalGapgu && !originalEulgu) {
          issues.push({
            id: "CTX_CANCEL_NO_ORIGINAL",
            category: "context",
            severity: "info",
            field: `갑구[${entry.order}]`,
            message: `갑구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본을 찾을 수 없습니다.`,
          });
        }
      }
    }
  }

  return issues;
}

/** 소유권 체인 일관성 검증 */
function validateOwnershipChain(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 최종 활성 소유권이전 항목 찾기
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
      field: "gapgu",
      message: "활성 소유권(보존/이전) 항목이 없습니다. 현재 소유자를 확인할 수 없습니다.",
    });
  }

  return issues;
}

/** 압류 후 근저당 설정 경고 */
function validateMortgageAfterSeizure(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 활성 압류/가압류 날짜 수집
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

  // 압류 이후 설정된 근저당 확인
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
      field: `을구[${mortgage.order}]`,
      message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 압류(${earliestSeizure}) 이후에 설정되었습니다. 비정상적 거래 패턴입니다.`,
      expected: `압류(${earliestSeizure}) 이전`,
      actual: mortgage.date,
    });
  }

  return issues;
}

/** 신탁 후 근저당 충돌 검증 */
function validateTrustMortgageConflict(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 활성 신탁 항목
  const trustEntries = parsed.gapgu.filter(
    (e) => /신탁/.test(e.purpose) && !e.isCancelled && e.date
  );

  if (trustEntries.length === 0) return issues;

  const trustDate = trustEntries[0].date;

  // 신탁 이후 설정된 근저당 (수탁자 동의 없이는 불가)
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
      field: `을구[${mortgage.order}]`,
      message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 신탁등기(${trustDate}) 이후에 설정되었습니다. 수탁자 동의 여부를 확인하세요.`,
      expected: "신탁 이전 또는 수탁자 동의",
      actual: `신탁(${trustDate}) 후 근저당(${mortgage.date})`,
    });
  }

  return issues;
}

/** 갑구 1번 항목 규칙 검증 */
function validateFirstEntryRule(parsed: ParsedRegistry): ValidationIssue[] {
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
      field: "갑구[1]",
      message: `갑구 1번 항목이 '${first.purpose}'입니다. 일반적으로 '소유권보존' 또는 '소유권이전'이어야 합니다.`,
      expected: "소유권보존 또는 소유권이전",
      actual: first.purpose,
    });
  }

  return issues;
}

/** 소유권 없이 을구만 있는 경우 검증 */
function validateEulguWithoutOwnership(
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
      field: "을구",
      message:
        "활성 소유권 항목이 없는데 을구(권리) 항목이 존재합니다. 등기부 구조가 비정상적입니다.",
    });
  }

  return issues;
}

// ─── A4. 크로스체크 검증 ───

/** ParseSummary 불리언 플래그 vs 실제 엔트리 교차검증 */
function validateSummaryFlags(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const activeGapgu = parsed.gapgu.filter((e) => !e.isCancelled);
  const activeEulgu = parsed.eulgu.filter((e) => !e.isCancelled);

  const flagChecks: Array<{
    flag: keyof ParseSummary;
    label: string;
    actual: boolean;
    expected: boolean;
  }> = [
    {
      flag: "hasSeizure",
      label: "압류",
      actual: parsed.summary.hasSeizure,
      expected: activeGapgu.some((e) => e.purpose === "압류"),
    },
    {
      flag: "hasProvisionalSeizure",
      label: "가압류",
      actual: parsed.summary.hasProvisionalSeizure,
      expected: activeGapgu.some((e) => e.purpose === "가압류"),
    },
    {
      flag: "hasProvisionalDisposition",
      label: "가처분",
      actual: parsed.summary.hasProvisionalDisposition,
      expected: activeGapgu.some((e) => e.purpose === "가처분"),
    },
    {
      flag: "hasAuctionOrder",
      label: "경매개시결정",
      actual: parsed.summary.hasAuctionOrder,
      expected: activeGapgu.some((e) => /경매개시결정/.test(e.purpose)),
    },
    {
      flag: "hasTrust",
      label: "신탁",
      actual: parsed.summary.hasTrust,
      expected: activeGapgu.some((e) => /신탁/.test(e.purpose)),
    },
    {
      flag: "hasProvisionalRegistration",
      label: "가등기",
      actual: parsed.summary.hasProvisionalRegistration,
      expected: [...activeGapgu, ...activeEulgu].some(
        (e) => e.purpose === "가등기"
      ),
    },
    {
      flag: "hasLeaseRegistration",
      label: "임차권등기",
      actual: parsed.summary.hasLeaseRegistration,
      expected: activeEulgu.some((e) =>
        /임차권등기|임차권설정/.test(e.purpose)
      ),
    },
    {
      flag: "hasWarningRegistration",
      label: "예고등기",
      actual: parsed.summary.hasWarningRegistration,
      expected: activeGapgu.some((e) => e.purpose === "예고등기"),
    },
    {
      flag: "hasRedemptionRegistration",
      label: "환매등기",
      actual: parsed.summary.hasRedemptionRegistration,
      expected: activeGapgu.some((e) => /환매/.test(e.purpose)),
    },
  ];

  for (const check of flagChecks) {
    if (check.actual !== check.expected) {
      issues.push({
        id: `XCHK_FLAG_${String(check.flag).toUpperCase()}`,
        category: "crosscheck",
        severity: "error",
        field: `summary.${String(check.flag)}`,
        message: `${check.label} 플래그 불일치: 요약값(${check.actual}) ≠ 실제 엔트리 기반(${check.expected})`,
        expected: String(check.expected),
        actual: String(check.actual),
      });
    }
  }

  return issues;
}

/** 추정가격 합리성 검증 */
function validateEstimatedPriceSanity(
  estimatedPrice: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (estimatedPrice <= 0) return issues;

  if (estimatedPrice < MIN_REASONABLE_PRICE) {
    issues.push({
      id: "XCHK_PRICE_SANITY",
      category: "crosscheck",
      severity: "error",
      field: "estimatedPrice",
      message: `추정가격(${(estimatedPrice / 10000).toLocaleString()}만원)이 한국 부동산으로서 비정상적으로 낮습니다.`,
      expected: `${(MIN_REASONABLE_PRICE / 100_000_000).toFixed(1)}억원 이상`,
      actual: `${(estimatedPrice / 100_000_000).toFixed(2)}억원`,
    });
  }

  if (estimatedPrice > MAX_REASONABLE_PRICE) {
    issues.push({
      id: "XCHK_PRICE_SANITY",
      category: "crosscheck",
      severity: "warning",
      field: "estimatedPrice",
      message: `추정가격(${(estimatedPrice / 100_000_000).toFixed(0)}억원)이 비정상적으로 높습니다.`,
      expected: `${(MAX_REASONABLE_PRICE / 100_000_000).toFixed(0)}억원 이하`,
      actual: `${(estimatedPrice / 100_000_000).toFixed(0)}억원`,
    });
  }

  return issues;
}

/** 리스크 스코어 팩터 vs 파싱 데이터 일치 검증 */
function validateRiskScoreConsistency(
  parsed: ParsedRegistry,
  riskScore: RiskScore
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 팩터 ID → 요약 플래그 매핑
  const factorFlagMap: Array<{
    factorId: string;
    flagKey: keyof ParseSummary;
    label: string;
  }> = [
    { factorId: "seizure", flagKey: "hasSeizure", label: "압류" },
    {
      factorId: "provisional_seizure",
      flagKey: "hasProvisionalSeizure",
      label: "가압류",
    },
    {
      factorId: "disposition",
      flagKey: "hasProvisionalDisposition",
      label: "가처분",
    },
    { factorId: "auction", flagKey: "hasAuctionOrder", label: "경매" },
    { factorId: "trust", flagKey: "hasTrust", label: "신탁" },
    {
      factorId: "provisional_reg",
      flagKey: "hasProvisionalRegistration",
      label: "가등기",
    },
    {
      factorId: "lease_registration",
      flagKey: "hasLeaseRegistration",
      label: "임차권등기",
    },
    {
      factorId: "warning_reg",
      flagKey: "hasWarningRegistration",
      label: "예고등기",
    },
    {
      factorId: "redemption",
      flagKey: "hasRedemptionRegistration",
      label: "환매등기",
    },
  ];

  for (const map of factorFlagMap) {
    const hasFactor = riskScore.factors.some((f) => f.id === map.factorId);
    const hasFlag = parsed.summary[map.flagKey] as boolean;

    // 팩터는 있는데 플래그는 false → 비정상
    if (hasFactor && !hasFlag) {
      issues.push({
        id: `XCHK_FACTOR_${map.factorId.toUpperCase()}`,
        category: "crosscheck",
        severity: "error",
        field: `riskScore.factors.${map.factorId}`,
        message: `${map.label} 리스크 팩터가 존재하지만 파싱 요약에서는 false입니다.`,
        expected: `summary.${String(map.flagKey)} === true`,
        actual: "false",
      });
    }

    // 플래그는 true인데 팩터 없음 → 스코어링 누락 가능
    if (hasFlag && !hasFactor) {
      issues.push({
        id: `XCHK_MISSING_FACTOR_${map.factorId.toUpperCase()}`,
        category: "crosscheck",
        severity: "info",
        field: `riskScore.factors`,
        message: `${map.label}이(가) 파싱에서 감지되었으나 리스크 팩터에 포함되지 않았습니다.`,
      });
    }
  }

  // 총감점 검증
  const recalcDeduction = riskScore.factors.reduce(
    (sum, f) => sum + f.deduction,
    0
  );
  if (recalcDeduction !== riskScore.totalDeduction) {
    issues.push({
      id: "XCHK_DEDUCTION_SUM",
      category: "crosscheck",
      severity: "error",
      field: "riskScore.totalDeduction",
      message: `총감점 불일치: 기록값(${riskScore.totalDeduction}) ≠ 팩터합산(${recalcDeduction})`,
      expected: String(recalcDeduction),
      actual: String(riskScore.totalDeduction),
    });
  }

  // 점수 = 100 - 감점 검증
  const expectedScore = Math.max(0, 100 - riskScore.totalDeduction);
  if (riskScore.totalScore !== expectedScore) {
    issues.push({
      id: "XCHK_SCORE_CALC",
      category: "crosscheck",
      severity: "error",
      field: "riskScore.totalScore",
      message: `점수 계산 불일치: 기록값(${riskScore.totalScore}) ≠ max(0, 100-${riskScore.totalDeduction})=${expectedScore}`,
      expected: String(expectedScore),
      actual: String(riskScore.totalScore),
    });
  }

  return issues;
}

/** AI 의견 관련성 검증 (소프트 체크) */
function validateAiOpinionRelevance(
  parsed: ParsedRegistry,
  aiOpinion: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!aiOpinion || aiOpinion.length < 10) return issues;

  const criticalChecks: Array<{
    flag: keyof ParseSummary;
    keywords: string[];
    label: string;
  }> = [
    {
      flag: "hasSeizure",
      keywords: ["압류"],
      label: "압류",
    },
    {
      flag: "hasAuctionOrder",
      keywords: ["경매"],
      label: "경매",
    },
    {
      flag: "hasTrust",
      keywords: ["신탁"],
      label: "신탁",
    },
    {
      flag: "hasLeaseRegistration",
      keywords: ["임차권", "임차권등기"],
      label: "임차권등기",
    },
  ];

  for (const check of criticalChecks) {
    if (parsed.summary[check.flag] as boolean) {
      const mentioned = check.keywords.some((kw) => aiOpinion.includes(kw));
      if (!mentioned) {
        issues.push({
          id: `XCHK_AI_MISSING_${check.label}`,
          category: "crosscheck",
          severity: "info",
          field: "aiOpinion",
          message: `AI 의견에서 '${check.label}' 관련 위험이 언급되지 않았습니다. (감지됨: ${check.label})`,
        });
      }
    }
  }

  return issues;
}

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

  // 갑구 항목별 검증
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

  // 을구 항목별 검증
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

  // 순위번호 검증
  totalChecks++;
  issues.push(...validateEntryOrder(parsed.gapgu, "갑구"));
  totalChecks++;
  issues.push(...validateEntryOrder(parsed.eulgu, "을구"));

  // 섹션 완전성
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
