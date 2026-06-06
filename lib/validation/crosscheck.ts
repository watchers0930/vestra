/**
 * VESTRA 검증 엔진 — A4 크로스체크 검증
 *
 * @module lib/validation/crosscheck
 */

import type { ParsedRegistry, ParseSummary } from "../registry-parser";
import type { RiskScore } from "../risk-scoring";
import type { ValidationIssue } from "../validation-engine";

// ─── 상수 ───

const MIN_REASONABLE_PRICE = 50_000_000;
const MAX_REASONABLE_PRICE = 50_000_000_000;

// ─── A4. 크로스체크 검증 ───

/** ParseSummary 불리언 플래그 vs 실제 엔트리 교차검증 */
export function validateSummaryFlags(
  parsed: ParsedRegistry
): ValidationIssue[] {
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
        field: `${check.label} 감지`,
        message: `${check.label} 감지 상태가 일치하지 않습니다. (요약: ${check.actual ? "있음" : "없음"}, 실제: ${check.expected ? "있음" : "없음"})`,
        expected: String(check.expected),
        actual: String(check.actual),
      });
    }
  }

  return issues;
}

/** 추정가격 합리성 검증 */
export function validateEstimatedPriceSanity(
  estimatedPrice: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (estimatedPrice <= 0) return issues;

  if (estimatedPrice < MIN_REASONABLE_PRICE) {
    issues.push({
      id: "XCHK_PRICE_SANITY",
      category: "crosscheck",
      severity: "error",
      field: "추정가격",
      message: `추정가격(${(estimatedPrice / 10000).toLocaleString()}만원)이 비정상적으로 낮습니다.`,
      expected: `${(MIN_REASONABLE_PRICE / 100_000_000).toFixed(1)}억원 이상`,
      actual: `${(estimatedPrice / 100_000_000).toFixed(2)}억원`,
    });
  }

  if (estimatedPrice > MAX_REASONABLE_PRICE) {
    issues.push({
      id: "XCHK_PRICE_SANITY",
      category: "crosscheck",
      severity: "warning",
      field: "추정가격",
      message: `추정가격(${(estimatedPrice / 100_000_000).toFixed(0)}억원)이 비정상적으로 높습니다.`,
      expected: `${(MAX_REASONABLE_PRICE / 100_000_000).toFixed(0)}억원 이하`,
      actual: `${(estimatedPrice / 100_000_000).toFixed(0)}억원`,
    });
  }

  return issues;
}

/** 리스크 스코어 팩터 vs 파싱 데이터 일치 검증 */
export function validateRiskScoreConsistency(
  parsed: ParsedRegistry,
  riskScore: RiskScore
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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

    if (hasFactor && !hasFlag) {
      issues.push({
        id: `XCHK_FACTOR_${map.factorId.toUpperCase()}`,
        category: "crosscheck",
        severity: "error",
        field: `${map.label} 위험 요인`,
        message: `${map.label} 위험 요인이 감지되었으나 파싱 결과와 일치하지 않습니다.`,
        expected: "감지됨",
        actual: "미감지",
      });
    }

    if (hasFlag && !hasFactor) {
      issues.push({
        id: `XCHK_MISSING_FACTOR_${map.factorId.toUpperCase()}`,
        category: "crosscheck",
        severity: "info",
        field: `${map.label} 위험 요인`,
        message: `${map.label}이(가) 감지되었으나 위험 점수 계산에 반영되지 않았습니다.`,
      });
    }
  }

  const recalcDeduction = riskScore.factors.reduce(
    (sum, f) => sum + f.deduction,
    0
  );
  if (recalcDeduction !== riskScore.totalDeduction) {
    issues.push({
      id: "XCHK_DEDUCTION_SUM",
      category: "crosscheck",
      severity: "error",
      field: "총감점",
      message: `총감점이 일치하지 않습니다. (기록: ${riskScore.totalDeduction}점, 합산: ${recalcDeduction}점)`,
      expected: String(recalcDeduction),
      actual: String(riskScore.totalDeduction),
    });
  }

  const expectedScore = Math.max(0, 100 - riskScore.totalDeduction);
  if (riskScore.totalScore !== expectedScore) {
    issues.push({
      id: "XCHK_SCORE_CALC",
      category: "crosscheck",
      severity: "error",
      field: "위험 점수",
      message: `위험 점수 계산이 일치하지 않습니다. (기록: ${riskScore.totalScore}점, 계산: ${expectedScore}점)`,
      expected: String(expectedScore),
      actual: String(riskScore.totalScore),
    });
  }

  return issues;
}

/** AI 의견 관련성 검증 (소프트 체크) */
export function validateAiOpinionRelevance(
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
          field: "AI 의견",
          message: `AI 의견에서 '${check.label}' 관련 위험이 언급되지 않았습니다.`,
        });
      }
    }
  }

  return issues;
}
