import { getGrade } from "./risk/grade-policy";
import { buildClaimRatios, evaluateClaimRatios, decisiveClaimRisk, SCORE_RULE_VERSION, type OwnJeonseRight, type ClaimRatioSet } from "./risk/claims-policy";
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
  claimRatios?: ClaimRatioSet;
  /** 레거시 입력에는 없을 수 있다. 신규 산출물은 VersionedRiskScore로 보장한다. */
  scoreRuleVersion?: string;
  decisiveHighRisk?: { reason: string; basis: "ratioToMarket" | "ratioToDeposit" | "combinedBurden"; ratio: number } | null;
  interactionPenalties?: import("./patent-types").RiskInteractionResult;
  temporalPatterns?: import("./patent-types").TemporalRiskResult;
}

export interface VersionedRiskScore extends RiskScore { scoreRuleVersion: string; }

// ─── 등급 체계 ───

// ─── 메인 스코어링 함수 ───

export function calculateRiskScore(
  parsed: ParsedRegistry,
  estimatedPrice?: number,
  userDeposit?: number,
  ownJeonseRight?: OwnJeonseRight
): VersionedRiskScore {
  const allFactors: RiskFactor[] = [];
  let totalDeduction = 0;

  // 1. 근저당 비율 평가
  const mortgageEval = evaluateMortgageRatio(parsed, estimatedPrice || 0);
  const claimRatios = buildClaimRatios(parsed, estimatedPrice, userDeposit, ownJeonseRight);

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
  const totalClaimsEval = evaluateClaimRatios(claimRatios);
  // 기본 감점은 max 한 번만 반영하되 양쪽 경고는 보존한다.
  // 감점을 배정받지 않은 경고도 심각도·근거를 유지해 고위험 안내에서 누락되지 않게 한다.
  const debtDeduction = Math.max(mortgageEval.deduction, totalClaimsEval.deduction);
  const claimsPrimary = totalClaimsEval.deduction >= mortgageEval.deduction;
  const warningOnly = (f: RiskFactor): RiskFactor => ({ ...f, deduction: 0,
    detail: `${f.detail} 기본 감점은 근저당·합산채권 중 큰 값에 한 번만 반영했습니다.` });
  const debtFactors = [
    ...mortgageEval.factors.map(f => claimsPrimary ? warningOnly(f) : f),
    ...totalClaimsEval.factors.map(f => !claimsPrimary && f.deduction > 0 ? warningOnly(f) : f),
  ];
  allFactors.push(...debtFactors);
  totalDeduction += debtDeduction;

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
  const interactionPenalties = evaluateInteractions([...allFactors.filter(f => !mortgageEval.factors.some(m => m.id === f.id)), ...mortgageEval.factors]);
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
      category: "변동이력",
      description: "단기간 권리 변동 패턴",
      deduction: temporalDeduction,
      severity: "medium",
      detail: `소유권 이전·근저당 설정 등 권리관계가 단기간에 반복해서 바뀐 패턴이 ${temporalPatterns.patterns.length}건 발견되어 주의가 필요합니다.`,
    });
  }
  totalDeduction += temporalDeduction;

  // 최종 점수 계산 (최소 0점)
  const totalScore = Math.max(0, 100 - totalDeduction);
  const { grade, label: gradeLabel, color: gradeColor } = getGrade(totalScore);

  const summary = generateSummary(totalScore, grade, gradeLabel, allFactors, parsed);

  return {
    claimRatios,
    scoreRuleVersion: SCORE_RULE_VERSION,
    decisiveHighRisk: decisiveClaimRisk(claimRatios),
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
