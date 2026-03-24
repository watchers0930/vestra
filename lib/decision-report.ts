/**
 * 매수/임대 의사결정 통합 리포트
 * ─────────────────────────────
 * 대출 가심사 + 시세 예측 + 세금 계산 + 보증보험 + 임대인 프로파일을
 * 하나의 종합 리포트로 통합.
 *
 * 무료: 요약 (등급 + 핵심 포인트 3개)
 * 유료 (4,900원): 전체 상세 리포트
 */

import { simulateLoan, type LoanSimulateInput, type LoanSimulateResponse } from "./loan-simulator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionReportInput {
  address: string;
  deposit: number;
  propertyPrice: number;
  propertyType: string;
  annualIncome: number;
  isFirstHome: boolean;
  transactionType: "JEONSE" | "PURCHASE";
}

export interface DecisionSummary {
  overallGrade: string;        // A~F
  recommendation: string;      // 추천 | 조건부 | 비추천
  keyPoints: string[];
  loanEligible: number;        // 가능 은행 수
  maxLoanAmount: number;
  lowestRate: number;
}

export interface DecisionReportResult {
  summary: DecisionSummary;
  loanSimulation: LoanSimulateResponse;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// 등급 산정
// ---------------------------------------------------------------------------

function calculateDecisionGrade(loan: LoanSimulateResponse, input: DecisionReportInput): {
  grade: string;
  recommendation: string;
  keyPoints: string[];
} {
  let score = 50; // 기본 중립
  const keyPoints: string[] = [];

  // 대출 가능 여부 (최대 +30)
  if (loan.summary.eligibleCount >= 3) {
    score += 30;
    keyPoints.push(`${loan.summary.eligibleCount}개 은행에서 대출 가능`);
  } else if (loan.summary.eligibleCount >= 1) {
    score += 15;
    keyPoints.push(`${loan.summary.eligibleCount}개 은행에서 대출 가능 (선택지 제한적)`);
  } else {
    score -= 20;
    keyPoints.push("대출 가능 은행 없음 — 자금 계획 재검토 필요");
  }

  // 금리 수준 (+10 ~ -10)
  if (loan.summary.lowestRate > 0 && loan.summary.lowestRate < 2.5) {
    score += 10;
    keyPoints.push(`최저 금리 ${loan.summary.lowestRate}% — 우대금리 적용 가능`);
  } else if (loan.summary.lowestRate >= 4.0) {
    score -= 10;
    keyPoints.push(`최저 금리 ${loan.summary.lowestRate}% — 금리 부담 주의`);
  }

  // 전세가율 (전세인 경우)
  if (input.transactionType === "JEONSE") {
    const jeonseRatio = (input.deposit / input.propertyPrice) * 100;
    if (jeonseRatio > 80) {
      score -= 15;
      keyPoints.push(`전세가율 ${jeonseRatio.toFixed(0)}% — 깡통전세 위험`);
    } else if (jeonseRatio > 60) {
      score -= 5;
      keyPoints.push(`전세가율 ${jeonseRatio.toFixed(0)}% — 주의 필요`);
    } else {
      score += 10;
      keyPoints.push(`전세가율 ${jeonseRatio.toFixed(0)}% — 안전 범위`);
    }
  }

  // 최대 3개 포인트만
  const topPoints = keyPoints.slice(0, 3);

  // 등급 매핑
  let grade: string;
  let recommendation: string;
  if (score >= 75) { grade = "A"; recommendation = "추천"; }
  else if (score >= 55) { grade = "B"; recommendation = "추천"; }
  else if (score >= 40) { grade = "C"; recommendation = "조건부"; }
  else if (score >= 25) { grade = "D"; recommendation = "비추천"; }
  else { grade = "F"; recommendation = "비추천"; }

  return { grade, recommendation, keyPoints: topPoints };
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

export function generateDecisionReport(input: DecisionReportInput): DecisionReportResult {
  // 대출 시뮬레이션
  const loanInput: LoanSimulateInput = {
    deposit: input.deposit,
    propertyPrice: input.propertyPrice,
    propertyType: input.propertyType,
    propertyAddress: input.address,
    annualIncome: input.annualIncome,
    isFirstHome: input.isFirstHome,
  };
  const loanSimulation = simulateLoan(loanInput);

  // 등급 산정
  const { grade, recommendation, keyPoints } = calculateDecisionGrade(loanSimulation, input);

  return {
    summary: {
      overallGrade: grade,
      recommendation,
      keyPoints,
      loanEligible: loanSimulation.summary.eligibleCount,
      maxLoanAmount: loanSimulation.summary.maxAvailable,
      lowestRate: loanSimulation.summary.lowestRate,
    },
    loanSimulation,
    generatedAt: new Date().toISOString(),
  };
}
