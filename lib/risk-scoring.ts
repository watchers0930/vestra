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

import { evaluateInteractions } from "./risk/interaction-analyzer";
import { detectTemporalPatterns } from "./risk/temporal-detector";
import {
  evaluateMortgageRatio,
  evaluateSeizure,
  evaluateDisposition,
  evaluateAuction,
  evaluateProvisionalRegistration,
  evaluateTrust,
  evaluateOwnershipFrequency,
  evaluateTotalClaims,
  evaluateMultipleMortgages,
  evaluateLeaseRegistration,
  evaluateWarningRegistration,
  evaluateRedemption,
  evaluatePropertyPurpose,
} from "./risk/evaluators";

// ─── re-export (기존 import 경로 유지) ───
export { INTERACTION_RULES, evaluateInteractions } from "./risk/interaction-analyzer";
export { dateToMonths, monthsBetween, detectTemporalPatterns } from "./risk/temporal-detector";

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
  interactionPenalties?: import("./patent-types").RiskInteractionResult;
  temporalPatterns?: import("./patent-types").TemporalRiskResult;
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

  // 13. 용도 불일치 경고
  const purposeFactors = evaluatePropertyPurpose(parsed);
  allFactors.push(...purposeFactors);
  totalDeduction += purposeFactors.reduce((s, f) => s + f.deduction, 0);

  // 14. 위험요소 상호작용 평가 (비선형 증폭)
  const interactionPenalties = evaluateInteractions(allFactors);
  if (interactionPenalties.totalInteractionPenalty > 0) {
    allFactors.push({
      id: "interaction_penalty",
      category: "복합위험",
      description: "복합위험 가중",
      deduction: interactionPenalties.totalInteractionPenalty,
      severity: "high",
      detail: `${interactionPenalties.appliedRules.length}건의 위험요소 상호작용으로 인한 추가 감점입니다.`,
    });
  }
  totalDeduction += interactionPenalties.totalInteractionPenalty;

  // 15. 시계열 이상 패턴 탐지
  const temporalPatterns = detectTemporalPatterns(parsed);
  const temporalDeduction = Math.min(20, Math.round(temporalPatterns.overallTemporalRisk * 0.2));
  if (temporalDeduction > 0) {
    allFactors.push({
      id: "temporal_pattern",
      category: "시계열",
      description: "시계열 이상 패턴",
      deduction: temporalDeduction,
      severity: "medium",
      detail: `${temporalPatterns.patterns.length}건의 시계열 이상 패턴이 탐지되어 추가 감점됩니다.`,
    });
  }
  totalDeduction += temporalDeduction;

  // 최종 점수 계산 (최소 0점)
  const totalScore = Math.max(0, 100 - totalDeduction);
  const grade = getGrade(totalScore);
  const { label: gradeLabel, color: gradeColor } = GRADE_MAP[grade];

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
    interactionPenalties,
    temporalPatterns,
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
