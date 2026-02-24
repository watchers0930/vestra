/**
 * VESTRA 리스크 스코어링 알고리즘
 * ──────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 등기부등본 파싱 결과를 입력받아 가중치 기반 정량적 위험도를 산출.
 *
 * 스코어링 모델: 100점 만점, 감점 방식
 * - 높은 점수 = 안전
 * - 낮은 점수 = 위험
 */

import type { ParsedRegistry } from "./registry-parser";

// ─── 타입 정의 ───

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  deduction: number;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
}

export interface RiskScore {
  totalScore: number;
  grade: RiskGrade;
  gradeLabel: string;
  gradeColor: string;
  factors: RiskFactor[];
  mortgageRatio: number;
  totalDeduction: number;
  summary: string;
}

// ─── 등급 체계 ───

interface GradeInfo {
  label: string;
  color: string;
}

const GRADE_MAP: Record<RiskGrade, GradeInfo> = {
  A: { label: "안전", color: "emerald" },
  B: { label: "양호", color: "blue" },
  C: { label: "주의", color: "amber" },
  D: { label: "위험", color: "orange" },
  F: { label: "매우위험", color: "red" },
};

function getGrade(score: number): RiskGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

// ─── 스코어링 규칙 ───

function evaluateMortgageRatio(
  parsed: ParsedRegistry,
  estimatedPrice: number
): { deduction: number; ratio: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const { totalMortgageAmount } = parsed.summary;

  if (!estimatedPrice || estimatedPrice <= 0) {
    return { deduction: 0, ratio: 0, factors };
  }

  const ratio = (totalMortgageAmount / estimatedPrice) * 100;

  if (ratio > 120) {
    factors.push({
      id: "mortgage_extreme",
      category: "근저당",
      description: "근저당 비율 매우 위험",
      deduction: 30,
      severity: "critical",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 120%를 초과합니다. 깡통주택 위험이 매우 높습니다.`,
    });
    return { deduction: 30, ratio, factors };
  }

  if (ratio > 100) {
    factors.push({
      id: "mortgage_very_high",
      category: "근저당",
      description: "근저당 비율 초과위험",
      deduction: 25,
      severity: "critical",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 깡통주택 위험이 높습니다.`,
    });
    return { deduction: 25, ratio, factors };
  }

  if (ratio > 80) {
    factors.push({
      id: "mortgage_high",
      category: "근저당",
      description: "근저당 비율 위험",
      deduction: 20,
      severity: "high",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 80%를 초과하여 보증금 회수 위험이 있습니다.`,
    });
    return { deduction: 20, ratio, factors };
  }

  if (ratio > 70) {
    factors.push({
      id: "mortgage_elevated",
      category: "근저당",
      description: "근저당 비율 주의",
      deduction: 10,
      severity: "medium",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 70%를 초과하여 주의가 필요합니다.`,
    });
    return { deduction: 10, ratio, factors };
  }

  if (ratio > 50) {
    factors.push({
      id: "mortgage_moderate",
      category: "근저당",
      description: "근저당 비율 보통",
      deduction: 5,
      severity: "low",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 일반적인 수준이나 모니터링이 필요합니다.`,
    });
    return { deduction: 5, ratio, factors };
  }

  return { deduction: 0, ratio, factors };
}

function evaluateSeizure(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const { hasProvisionalSeizure, hasSeizure } = parsed.summary;

  if (hasSeizure) {
    const count = parsed.gapgu.filter((e) => e.purpose === "압류" && !e.isCancelled).length;
    factors.push({
      id: "seizure",
      category: "압류",
      description: "압류 등기 존재",
      deduction: 25 * count,
      severity: "critical",
      detail: `현행 압류가 ${count}건 설정되어 있습니다. 소유권 행사에 심각한 제한이 있으며, 경매 진행 가능성이 높습니다.`,
    });
  }

  if (hasProvisionalSeizure) {
    const count = parsed.gapgu.filter((e) => e.purpose === "가압류" && !e.isCancelled).length;
    factors.push({
      id: "provisional_seizure",
      category: "가압류",
      description: "가압류 등기 존재",
      deduction: 20 * count,
      severity: "critical",
      detail: `현행 가압류가 ${count}건 설정되어 있습니다. 채무 분쟁이 있으며, 본압류로 전환될 수 있습니다.`,
    });
  }

  return factors;
}

function evaluateDisposition(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasProvisionalDisposition) {
    const count = parsed.gapgu.filter((e) => e.purpose === "가처분" && !e.isCancelled).length;
    factors.push({
      id: "disposition",
      category: "가처분",
      description: "가처분 등기 존재",
      deduction: 15 * count,
      severity: "high",
      detail: `처분금지 가처분이 ${count}건 설정되어 있습니다. 소유권 이전에 법적 분쟁이 있습니다.`,
    });
  }

  return factors;
}

function evaluateAuction(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasAuctionOrder) {
    factors.push({
      id: "auction",
      category: "경매",
      description: "경매개시결정 존재",
      deduction: 30,
      severity: "critical",
      detail: "경매가 개시된 부동산입니다. 보증금 회수가 매우 어려울 수 있으며, 임차인 보호에 각별한 주의가 필요합니다.",
    });
  }

  return factors;
}

function evaluateProvisionalRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasProvisionalRegistration) {
    factors.push({
      id: "provisional_reg",
      category: "가등기",
      description: "가등기 존재",
      deduction: 10,
      severity: "medium",
      detail: "가등기가 설정되어 있습니다. 본등기로 전환 시 후순위 권리가 말소될 수 있습니다.",
    });
  }

  return factors;
}

function evaluateTrust(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasTrust) {
    factors.push({
      id: "trust",
      category: "신탁",
      description: "신탁등기 존재",
      deduction: 15,
      severity: "high",
      detail: "신탁등기가 설정된 부동산입니다. 수탁자의 동의 없이 처분이 불가하며, 신탁원부 확인이 필요합니다.",
    });
  }

  return factors;
}

function evaluateOwnershipFrequency(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const { ownershipTransferCount } = parsed.summary;

  if (ownershipTransferCount >= 4) {
    factors.push({
      id: "ownership_freq_high",
      category: "소유권",
      description: "소유권 이전 빈도 매우 높음",
      deduction: 15,
      severity: "high",
      detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 잦은 거래는 투기 또는 하자 물건의 징후일 수 있습니다.`,
    });
  } else if (ownershipTransferCount >= 3) {
    factors.push({
      id: "ownership_freq",
      category: "소유권",
      description: "소유권 이전 빈도 높음",
      deduction: 10,
      severity: "medium",
      detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 평균 이상의 거래 빈도로 주의가 필요합니다.`,
    });
  }

  return factors;
}

function evaluateTotalClaims(
  parsed: ParsedRegistry,
  estimatedPrice: number
): { deduction: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const { totalClaimsAmount } = parsed.summary;

  if (!estimatedPrice || estimatedPrice <= 0 || totalClaimsAmount <= 0) {
    return { deduction: 0, factors };
  }

  const ratio = (totalClaimsAmount / estimatedPrice) * 100;

  if (ratio > 100) {
    factors.push({
      id: "total_claims_critical",
      category: "선순위채권",
      description: "선순위채권 합산 초과",
      deduction: 25,
      severity: "critical",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 보증금 전액 미회수 위험이 매우 높습니다.`,
    });
    return { deduction: 25, factors };
  }

  if (ratio > 80) {
    factors.push({
      id: "total_claims_high",
      category: "선순위채권",
      description: "선순위채권 합산 위험",
      deduction: 15,
      severity: "high",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 경매 시 보증금 전액 회수가 어려울 수 있습니다.`,
    });
    return { deduction: 15, factors };
  }

  if (ratio > 60) {
    factors.push({
      id: "total_claims_moderate",
      category: "선순위채권",
      description: "선순위채권 합산 주의",
      deduction: 8,
      severity: "medium",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 추가 채권 설정 시 위험 수준에 도달할 수 있습니다.`,
    });
    return { deduction: 8, factors };
  }

  return { deduction: 0, factors };
}

function evaluateLeaseRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasLeaseRegistration) {
    const count = parsed.eulgu.filter(
      (e) => /임차권등기|임차권설정/.test(e.purpose) && !e.isCancelled
    ).length;
    factors.push({
      id: "lease_registration",
      category: "임차권등기",
      description: "임차권등기명령 존재",
      deduction: 20,
      severity: "critical",
      detail: `임차권등기가 ${count}건 설정되어 있습니다. 이전 임차인이 보증금을 반환받지 못한 상태이며, 해당 물건의 보증금 미반환 이력을 의미합니다.`,
    });
  }

  return factors;
}

function evaluateWarningRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasWarningRegistration) {
    factors.push({
      id: "warning_reg",
      category: "예고등기",
      description: "예고등기 존재",
      deduction: 12,
      severity: "high",
      detail: "예고등기가 설정되어 있습니다. 등기원인의 무효·취소 소송이 진행 중이며, 소유권 변동 가능성이 있습니다.",
    });
  }

  return factors;
}

function evaluateRedemption(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasRedemptionRegistration) {
    factors.push({
      id: "redemption",
      category: "환매등기",
      description: "환매등기 존재",
      deduction: 10,
      severity: "medium",
      detail: "환매등기가 설정되어 있습니다. 매도인의 환매권 행사로 소유권이 원복될 수 있습니다.",
    });
  }

  return factors;
}

function evaluateMultipleMortgages(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const activeMortgages = parsed.eulgu.filter(
    (e) => /근저당|저당/.test(e.purpose) && !e.isCancelled
  ).length;

  if (activeMortgages >= 3) {
    factors.push({
      id: "multi_mortgage",
      category: "근저당",
      description: "다수 근저당 설정",
      deduction: 10,
      severity: "medium",
      detail: `현행 근저당이 ${activeMortgages}건 설정되어 있습니다. 다수의 채권자가 존재하여 권리관계가 복잡합니다.`,
    });
  }

  return factors;
}

// ─── 메인 스코어링 함수 ───

export function calculateRiskScore(
  parsed: ParsedRegistry,
  estimatedPrice?: number
): RiskScore {
  const allFactors: RiskFactor[] = [];
  let totalDeduction = 0;

  // 1. 근저당 비율 평가
  const mortgageEval = evaluateMortgageRatio(parsed, estimatedPrice || 0);
  allFactors.push(...mortgageEval.factors);
  totalDeduction += mortgageEval.deduction;

  // 2. 압류/가압류 평가
  const seizureFactors = evaluateSeizure(parsed);
  allFactors.push(...seizureFactors);
  totalDeduction += seizureFactors.reduce((s, f) => s + f.deduction, 0);

  // 3. 가처분 평가
  const dispositionFactors = evaluateDisposition(parsed);
  allFactors.push(...dispositionFactors);
  totalDeduction += dispositionFactors.reduce((s, f) => s + f.deduction, 0);

  // 4. 경매 평가
  const auctionFactors = evaluateAuction(parsed);
  allFactors.push(...auctionFactors);
  totalDeduction += auctionFactors.reduce((s, f) => s + f.deduction, 0);

  // 5. 가등기 평가
  const provisionalFactors = evaluateProvisionalRegistration(parsed);
  allFactors.push(...provisionalFactors);
  totalDeduction += provisionalFactors.reduce((s, f) => s + f.deduction, 0);

  // 6. 신탁 평가
  const trustFactors = evaluateTrust(parsed);
  allFactors.push(...trustFactors);
  totalDeduction += trustFactors.reduce((s, f) => s + f.deduction, 0);

  // 7. 소유권 이전 빈도 평가
  const ownershipFactors = evaluateOwnershipFrequency(parsed);
  allFactors.push(...ownershipFactors);
  totalDeduction += ownershipFactors.reduce((s, f) => s + f.deduction, 0);

  // 8. 다수 근저당 평가
  const multiMortgageFactors = evaluateMultipleMortgages(parsed);
  allFactors.push(...multiMortgageFactors);
  totalDeduction += multiMortgageFactors.reduce((s, f) => s + f.deduction, 0);

  // 9. 선순위채권 합산 분석 (근저당+전세 vs 시세)
  const totalClaimsEval = evaluateTotalClaims(parsed, estimatedPrice || 0);
  allFactors.push(...totalClaimsEval.factors);
  totalDeduction += totalClaimsEval.deduction;

  // 10. 임차권등기명령 평가
  const leaseRegFactors = evaluateLeaseRegistration(parsed);
  allFactors.push(...leaseRegFactors);
  totalDeduction += leaseRegFactors.reduce((s, f) => s + f.deduction, 0);

  // 11. 예고등기 평가
  const warningRegFactors = evaluateWarningRegistration(parsed);
  allFactors.push(...warningRegFactors);
  totalDeduction += warningRegFactors.reduce((s, f) => s + f.deduction, 0);

  // 12. 환매등기 평가
  const redemptionFactors = evaluateRedemption(parsed);
  allFactors.push(...redemptionFactors);
  totalDeduction += redemptionFactors.reduce((s, f) => s + f.deduction, 0);

  // 최종 점수 계산 (최소 0점)
  const totalScore = Math.max(0, 100 - totalDeduction);
  const grade = getGrade(totalScore);
  const { label: gradeLabel, color: gradeColor } = GRADE_MAP[grade];

  // 요약 생성
  const summary = generateSummary(totalScore, grade, gradeLabel, allFactors, parsed);

  return {
    totalScore,
    grade,
    gradeLabel,
    gradeColor,
    factors: allFactors.sort((a, b) => b.deduction - a.deduction),
    mortgageRatio: mortgageEval.ratio,
    totalDeduction,
    summary,
  };
}

function generateSummary(
  score: number,
  grade: RiskGrade,
  gradeLabel: string,
  factors: RiskFactor[],
  parsed: ParsedRegistry
): string {
  const parts: string[] = [];

  parts.push(`종합 안전등급 ${grade}등급 (${gradeLabel}, ${score}점/100점).`);

  const criticalCount = factors.filter((f) => f.severity === "critical").length;
  const highCount = factors.filter((f) => f.severity === "high").length;

  if (criticalCount > 0) {
    parts.push(`치명적 위험요소 ${criticalCount}건 발견.`);
  }
  if (highCount > 0) {
    parts.push(`고위험 요소 ${highCount}건 발견.`);
  }

  if (factors.length === 0) {
    parts.push("특이 위험요소가 발견되지 않았습니다.");
  }

  const { activeGapguEntries, activeEulguEntries } = parsed.summary;
  parts.push(`현행 갑구 ${activeGapguEntries}건, 을구 ${activeEulguEntries}건.`);

  return parts.join(" ");
}
