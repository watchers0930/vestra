/**
 * VESTRA 검증 엔진 — A1(포맷/타입) + A2(합계/산술)
 */

import type {
  ParsedRegistry,
  GapguEntry,
  EulguEntry,
  RiskType,
} from "../registry-parser";
import type { RiskScore } from "../risk-scoring";
import type { ValidationIssue } from "../validation-engine";

// ─── 상수 ───

const VALID_RISK_TYPES: RiskType[] = ["danger", "warning", "safe", "info"];
const MIN_REASONABLE_AMOUNT = 1_000_000;
const MAX_REASONABLE_AMOUNT = 50_000_000_000;
const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 2035;

// ─── 필드명 → 사용자 친화적 라벨 변환 ───

export function humanField(field: string): string {
  return field
    .replace(/갑구\[(\d+)\]\.date/, "갑구 $1번 접수일자")
    .replace(/갑구\[(\d+)\]\.holder/, "갑구 $1번 권리자")
    .replace(/갑구\[(\d+)\]\.riskType/, "갑구 $1번 위험유형")
    .replace(/을구\[(\d+)\]\.date/, "을구 $1번 접수일자")
    .replace(/을구\[(\d+)\]\.holder/, "을구 $1번 권리자")
    .replace(/을구\[(\d+)\]\.amount/, "을구 $1번 채권액")
    .replace(/을구\[(\d+)\]\.riskType/, "을구 $1번 위험유형")
    .replace(/갑구\[(\d+)\]/, "갑구 $1번")
    .replace(/을구\[(\d+)\]/, "을구 $1번")
    .replace(/갑구\.order/, "갑구 순위번호")
    .replace(/을구\.order/, "을구 순위번호")
    .replace(/title\.address/, "표제부 소재지")
    .replace(/summary\.totalMortgageAmount/, "근저당 합계")
    .replace(/summary\.totalJeonseAmount/, "전세권 합계")
    .replace(/summary\.totalClaimsAmount/, "총채권액")
    .replace(/summary\.activeGapguEntries/, "갑구 활성건수")
    .replace(/summary\.activeEulguEntries/, "을구 활성건수")
    .replace(/summary\.totalGapguEntries/, "갑구 전체건수")
    .replace(/summary\.totalEulguEntries/, "을구 전체건수")
    .replace(/summary\.ownershipTransferCount/, "소유권이전 횟수")
    .replace(/summary\.has\w+/, "요약 플래그")
    .replace(/riskScore\.mortgageRatio/, "근저당비율")
    .replace(/riskScore\.totalDeduction/, "총감점")
    .replace(/riskScore\.totalScore/, "위험 점수")
    .replace(/riskScore\.factors\.\w+/, "위험 요인")
    .replace(/riskScore\.factors/, "위험 요인")
    .replace(/estimatedPrice/, "추정가격")
    .replace(/aiOpinion/, "AI 의견")
    .replace(/^gapgu$/, "갑구")
    .replace(/^eulgu$/, "을구");
}

// ─── A1. 포맷 및 타입 검증 ───

/** 날짜 형식 검증 (YYYY.MM.DD, 합리적 범위) */
export function validateDateFormat(
  date: string,
  field: string
): ValidationIssue | null {
  const label = humanField(field);
  if (!date || date === "") {
    return {
      id: "FMT_DATE_EMPTY",
      category: "format",
      severity: "warning",
      field: label,
      message: `${label}의 날짜가 비어 있습니다.`,
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
      field: label,
      message: `${label}의 날짜 형식이 올바르지 않습니다.`,
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
      field: label,
      message: `${label}의 연도(${year})가 합리적 범위(${MIN_DATE_YEAR}~${MAX_DATE_YEAR}) 밖입니다.`,
      expected: `${MIN_DATE_YEAR}~${MAX_DATE_YEAR}`,
      actual: String(year),
    };
  }

  if (month < 1 || month > 12) {
    return {
      id: "FMT_DATE_MONTH",
      category: "format",
      severity: "error",
      field: label,
      message: `${label}의 월(${month})이 유효하지 않습니다.`,
      expected: "01~12",
      actual: String(month),
    };
  }

  if (day < 1 || day > 31) {
    return {
      id: "FMT_DATE_DAY",
      category: "format",
      severity: "error",
      field: label,
      message: `${label}의 일(${day})이 유효하지 않습니다.`,
      expected: "01~31",
      actual: String(day),
    };
  }

  return null;
}

/** 금액 형식 검증 (양수, 합리적 범위) */
export function validateAmountFormat(
  amount: number,
  field: string
): ValidationIssue | null {
  const label = humanField(field);
  if (amount === 0) return null;

  if (amount < 0) {
    return {
      id: "FMT_AMOUNT_NEGATIVE",
      category: "format",
      severity: "error",
      field: label,
      message: `${label}의 금액이 음수(${amount.toLocaleString()}원)입니다.`,
      expected: "0 이상",
      actual: String(amount),
    };
  }

  if (amount > 0 && amount < MIN_REASONABLE_AMOUNT) {
    return {
      id: "FMT_AMOUNT_TOO_LOW",
      category: "format",
      severity: "warning",
      field: label,
      message: `${label}의 금액(${amount.toLocaleString()}원)이 비정상적으로 낮습니다.`,
      expected: `${MIN_REASONABLE_AMOUNT.toLocaleString()}원 이상`,
      actual: `${amount.toLocaleString()}원`,
    };
  }

  if (amount > MAX_REASONABLE_AMOUNT) {
    return {
      id: "FMT_AMOUNT_TOO_HIGH",
      category: "format",
      severity: "warning",
      field: label,
      message: `${label}의 금액(${(amount / 100_000_000).toFixed(1)}억원)이 비정상적으로 높습니다.`,
      expected: `${(MAX_REASONABLE_AMOUNT / 100_000_000).toFixed(0)}억원 이하`,
      actual: `${(amount / 100_000_000).toFixed(1)}억원`,
    };
  }

  return null;
}

/** 순위번호 순차 검증 */
export function validateEntryOrder(
  entries: (GapguEntry | EulguEntry)[],
  section: "갑구" | "을구"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (entries.length === 0) return issues;

  const orders = entries.map((e) => e.order);

  const seen = new Set<number>();
  for (const order of orders) {
    if (seen.has(order)) {
      issues.push({
        id: "FMT_ORDER_DUPLICATE",
        category: "format",
        severity: "warning",
        field: `${section} 순위번호`,
        message: `${section}에서 순위번호 ${order}번이 중복되었습니다.`,
        expected: "고유한 순위번호",
        actual: `${order} (중복)`,
      });
    }
    seen.add(order);
  }

  for (const order of orders) {
    if (order <= 0) {
      issues.push({
        id: "FMT_ORDER_INVALID",
        category: "format",
        severity: "error",
        field: `${section} 순위번호`,
        message: `${section}의 순위번호(${order})가 유효하지 않습니다.`,
        expected: "1 이상 양수",
        actual: String(order),
      });
    }
  }

  return issues;
}

/** 권리자명 검증 */
export function validateHolderName(
  holder: string,
  field: string
): ValidationIssue | null {
  const label = humanField(field);
  if (!holder || holder === "") {
    return {
      id: "FMT_HOLDER_EMPTY",
      category: "format",
      severity: "info",
      field: label,
      message: `${label} 정보가 추출되지 않았습니다.`,
    };
  }

  if (holder.length < 2) {
    return {
      id: "FMT_HOLDER_SHORT",
      category: "format",
      severity: "warning",
      field: label,
      message: `${label}의 이름(${holder})이 너무 짧습니다.`,
      expected: "2자 이상",
      actual: `${holder.length}자`,
    };
  }

  if (holder.length > 30) {
    return {
      id: "FMT_HOLDER_LONG",
      category: "format",
      severity: "warning",
      field: label,
      message: `${label}의 이름이 비정상적으로 깁니다 (${holder.length}자).`,
      expected: "30자 이내",
      actual: `${holder.length}자`,
    };
  }

  return null;
}

/** 위험유형 열거값 검증 */
export function validateRiskType(
  riskType: RiskType,
  field: string
): ValidationIssue | null {
  const label = humanField(field);
  if (!VALID_RISK_TYPES.includes(riskType)) {
    return {
      id: "FMT_RISKTYPE_INVALID",
      category: "format",
      severity: "error",
      field: label,
      message: `${label} 분류(${riskType})가 유효하지 않습니다.`,
      expected: VALID_RISK_TYPES.join(" | "),
      actual: String(riskType),
    };
  }
  return null;
}

/** 섹션 완전성 검증 */
export function validateSectionCompleteness(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!parsed.title.address || parsed.title.address.trim() === "") {
    issues.push({
      id: "FMT_SECTION_NO_ADDRESS",
      category: "format",
      severity: "warning",
      field: "표제부 소재지",
      message: "표제부에서 소재지 주소를 추출하지 못했습니다.",
    });
  }

  if (parsed.gapgu.length === 0) {
    issues.push({
      id: "FMT_SECTION_NO_GAPGU",
      category: "format",
      severity: "warning",
      field: "갑구",
      message: "갑구(소유권) 항목이 없습니다. 파싱이 실패했을 수 있습니다.",
    });
  }

  return issues;
}

// ─── A2. 합계 및 산술 검증 ───

/** 근저당 합계 재계산 검증 */
export function validateMortgageSum(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalculated = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && !e.isCancelled)
    .reduce((sum, e) => sum + e.amount, 0);

  if (recalculated !== parsed.summary.totalMortgageAmount) {
    issues.push({
      id: "ARITH_MORTGAGE_SUM",
      category: "arithmetic",
      severity: "error",
      field: "근저당 합계",
      message: `근저당 합계가 일치하지 않습니다. (요약: ${parsed.summary.totalMortgageAmount.toLocaleString()}원, 재계산: ${recalculated.toLocaleString()}원)`,
      expected: recalculated.toLocaleString(),
      actual: parsed.summary.totalMortgageAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 전세권 합계 재계산 검증 */
export function validateJeonseSum(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalculated = parsed.eulgu
    .filter((e) => /전세권/.test(e.purpose) && !e.isCancelled)
    .reduce((sum, e) => sum + e.amount, 0);

  if (recalculated !== parsed.summary.totalJeonseAmount) {
    issues.push({
      id: "ARITH_JEONSE_SUM",
      category: "arithmetic",
      severity: "error",
      field: "전세권 합계",
      message: `전세권 합계가 일치하지 않습니다. (요약: ${parsed.summary.totalJeonseAmount.toLocaleString()}원, 재계산: ${recalculated.toLocaleString()}원)`,
      expected: recalculated.toLocaleString(),
      actual: parsed.summary.totalJeonseAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 총채권액 = 근저당 + 전세 검증 */
export function validateTotalClaims(parsed: ParsedRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected =
    parsed.summary.totalMortgageAmount + parsed.summary.totalJeonseAmount;

  if (parsed.summary.totalClaimsAmount !== expected) {
    issues.push({
      id: "ARITH_TOTAL_CLAIMS",
      category: "arithmetic",
      severity: "error",
      field: "총채권액",
      message: `총채권액이 일치하지 않습니다. (요약: ${parsed.summary.totalClaimsAmount.toLocaleString()}원, 근저당+전세: ${expected.toLocaleString()}원)`,
      expected: expected.toLocaleString(),
      actual: parsed.summary.totalClaimsAmount.toLocaleString(),
    });
  }

  return issues;
}

/** 근저당비율 재계산 교차검증 */
export function validateMortgageRatio(
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
      field: "근저당비율",
      message: `근저당비율이 일치하지 않습니다. (스코어링: ${riskScore.mortgageRatio.toFixed(1)}%, 재계산: ${recalcRatio.toFixed(1)}%)`,
      expected: `${recalcRatio.toFixed(1)}%`,
      actual: `${riskScore.mortgageRatio.toFixed(1)}%`,
    });
  }

  return issues;
}

/** 활성 건수 재계산 검증 */
export function validateActiveEntryCounts(
  parsed: ParsedRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const recalcActiveGapgu = parsed.gapgu.filter((e) => !e.isCancelled).length;
  if (recalcActiveGapgu !== parsed.summary.activeGapguEntries) {
    issues.push({
      id: "ARITH_ACTIVE_GAPGU",
      category: "arithmetic",
      severity: "error",
      field: "갑구 활성건수",
      message: `갑구 활성건수가 일치하지 않습니다. (요약: ${parsed.summary.activeGapguEntries}건, 재계산: ${recalcActiveGapgu}건)`,
      expected: String(recalcActiveGapgu),
      actual: String(parsed.summary.activeGapguEntries),
    });
  }

  const recalcActiveEulgu = parsed.eulgu.filter((e) => !e.isCancelled).length;
  if (recalcActiveEulgu !== parsed.summary.activeEulguEntries) {
    issues.push({
      id: "ARITH_ACTIVE_EULGU",
      category: "arithmetic",
      severity: "error",
      field: "을구 활성건수",
      message: `을구 활성건수가 일치하지 않습니다. (요약: ${parsed.summary.activeEulguEntries}건, 재계산: ${recalcActiveEulgu}건)`,
      expected: String(recalcActiveEulgu),
      actual: String(parsed.summary.activeEulguEntries),
    });
  }

  if (parsed.summary.totalGapguEntries !== parsed.gapgu.length) {
    issues.push({
      id: "ARITH_TOTAL_GAPGU",
      category: "arithmetic",
      severity: "error",
      field: "갑구 전체건수",
      message: `갑구 전체건수가 일치하지 않습니다. (요약: ${parsed.summary.totalGapguEntries}건, 실제: ${parsed.gapgu.length}건)`,
      expected: String(parsed.gapgu.length),
      actual: String(parsed.summary.totalGapguEntries),
    });
  }

  if (parsed.summary.totalEulguEntries !== parsed.eulgu.length) {
    issues.push({
      id: "ARITH_TOTAL_EULGU",
      category: "arithmetic",
      severity: "error",
      field: "을구 전체건수",
      message: `을구 전체건수가 일치하지 않습니다. (요약: ${parsed.summary.totalEulguEntries}건, 실제: ${parsed.eulgu.length}건)`,
      expected: String(parsed.eulgu.length),
      actual: String(parsed.summary.totalEulguEntries),
    });
  }

  return issues;
}

/** 소유권이전 횟수 재계산 검증 */
export function validateOwnershipTransferCount(
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
      field: "소유권이전 횟수",
      message: `소유권이전 횟수가 일치하지 않습니다. (요약: ${parsed.summary.ownershipTransferCount}회, 재계산: ${recalculated}회)`,
      expected: String(recalculated),
      actual: String(parsed.summary.ownershipTransferCount),
    });
  }

  return issues;
}
