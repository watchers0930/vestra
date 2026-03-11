/**
 * VESTRA 통합 리스크 리포트 생성기
 * ──────────────────────────────────
 * 여러 분석 결과(권리분석, 계약분석, 시세분석)를
 * 하나의 통합 리포트로 결합한다.
 */

import type { RiskScore, RiskGrade } from "./risk-scoring";
import { generateChecklist, type ChecklistItem } from "./checklist-generator";
import type { VScoreResult } from "./patent-types";
import { calculateVScore, type VScoreInput } from "./v-score";

// ─── 타입 정의 ───

export interface IntegratedReportData {
  /** 보고서 기본 정보 */
  reportId: string;
  generatedAt: string;
  version: string;

  /** 물건 정보 */
  propertyInfo: {
    address: string;
    type: string;
    estimatedPrice: number;
    jeonsePrice?: number;
    jeonseRatio?: number;
  };

  /** 권리분석 결과 */
  registryRisk?: {
    score: RiskScore;
    factorCount: number;
    criticalCount: number;
  };

  /** 계약분석 결과 */
  contractRisk?: {
    riskClauses: number;
    missingClauses: number;
    overallRisk: "low" | "medium" | "high";
    highlights: string[];
  };

  /** 시세분석 결과 */
  priceAnalysis?: {
    currentEstimate: number;
    scenarioOptimistic: number;
    scenarioBase: number;
    scenarioPessimistic: number;
    confidence: number;
  };

  /** 동적 체크리스트 */
  checklist: ChecklistItem[];

  /** V-Score 통합 위험도 */
  vScore?: VScoreResult;

  /** 종합 등급 */
  overallGrade: RiskGrade;
  overallScore: number;
  summary: string;
  recommendations: string[];
}

// ─── 분석 데이터 파싱 ───

interface StoredAnalysis {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  summary: string;
  data: string; // JSON string
  createdAt: Date | string;
}

function parseAnalysisData(analysis: StoredAnalysis): Record<string, unknown> {
  try {
    return JSON.parse(analysis.data);
  } catch {
    return {};
  }
}

// ─── 종합 등급 계산 ───

function calculateOverallGrade(report: Partial<IntegratedReportData>): {
  grade: RiskGrade;
  score: number;
} {
  const scores: number[] = [];

  // 권리분석 점수
  if (report.registryRisk?.score) {
    scores.push(report.registryRisk.score.totalScore);
  }

  // 계약분석 점수 (위험도 역산)
  if (report.contractRisk) {
    const riskMap = { low: 90, medium: 60, high: 30 };
    scores.push(riskMap[report.contractRisk.overallRisk] || 50);
  }

  // 시세 안정성 점수
  if (report.priceAnalysis) {
    const priceStability =
      report.priceAnalysis.confidence * 100;
    scores.push(Math.min(100, priceStability));
  }

  const avgScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 50;

  let grade: RiskGrade;
  if (avgScore >= 85) grade = "A";
  else if (avgScore >= 70) grade = "B";
  else if (avgScore >= 50) grade = "C";
  else if (avgScore >= 30) grade = "D";
  else grade = "F";

  return { grade, score: Math.round(avgScore) };
}

// ─── 권고사항 생성 ───

function generateRecommendations(
  report: Partial<IntegratedReportData>
): string[] {
  const recs: string[] = [];

  // 권리분석 기반
  if (report.registryRisk) {
    const { score } = report.registryRisk;
    if (score.mortgageRatio > 70) {
      recs.push(
        `근저당 비율 ${score.mortgageRatio}%로 높습니다. 전세보증금반환보증 가입을 강력히 권고합니다.`
      );
    }
    const criticals = score.factors.filter((f) => f.severity === "critical");
    for (const f of criticals) {
      recs.push(`[긴급] ${f.description} — ${f.detail}`);
    }
  }

  // 계약분석 기반
  if (report.contractRisk) {
    if (report.contractRisk.missingClauses > 0) {
      recs.push(
        `계약서에 ${report.contractRisk.missingClauses}개의 누락 조항이 있습니다. 계약 전 보완을 요청하세요.`
      );
    }
    if (report.contractRisk.overallRisk === "high") {
      recs.push(
        "계약서 위험도가 높습니다. 법률 전문가 검토를 권고합니다."
      );
    }
  }

  // 시세 기반
  if (report.priceAnalysis && report.propertyInfo?.jeonseRatio) {
    if (report.propertyInfo.jeonseRatio > 80) {
      recs.push(
        `전세가율 ${report.propertyInfo.jeonseRatio}%로 매우 높습니다. 깡통전세 위험에 유의하세요.`
      );
    }
  }

  // 기본 권고
  if (recs.length === 0) {
    recs.push("특별한 위험 요소가 발견되지 않았으나, 거래 전 최신 등기부등본을 반드시 재확인하세요.");
  }

  return recs;
}

// ─── 메인 함수 ───

/**
 * 여러 분석 결과를 통합 리포트로 결합
 */
export function aggregateReport(
  analyses: StoredAnalysis[],
  propertyAddress: string
): IntegratedReportData {
  const report: Partial<IntegratedReportData> = {
    reportId: `RPT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    version: "1.0.0",
    propertyInfo: {
      address: propertyAddress,
      type: "부동산",
      estimatedPrice: 0,
    },
  };

  // 각 분석 타입별 데이터 추출
  for (const analysis of analyses) {
    const data = parseAnalysisData(analysis);

    if (
      analysis.type === "analyze-rights" ||
      analysis.type === "analyze-unified"
    ) {
      // 권리분석 결과
      const riskAnalysis = data.riskAnalysis as RiskScore | undefined;
      if (riskAnalysis) {
        report.registryRisk = {
          score: riskAnalysis,
          factorCount: riskAnalysis.factors.length,
          criticalCount: riskAnalysis.factors.filter(
            (f) => f.severity === "critical"
          ).length,
        };
      }

      // 물건 정보 업데이트
      const propInfo = data.propertyInfo as Record<string, unknown> | undefined;
      if (propInfo && report.propertyInfo) {
        report.propertyInfo.estimatedPrice =
          (propInfo.estimatedPrice as number) ||
          report.propertyInfo.estimatedPrice;
        report.propertyInfo.jeonsePrice =
          (propInfo.jeonsePrice as number) || undefined;
        report.propertyInfo.jeonseRatio =
          (propInfo.jeonseRatio as number) || undefined;
        report.propertyInfo.type =
          (propInfo.type as string) || report.propertyInfo.type;
      }
    }

    if (analysis.type === "analyze-contract") {
      // 계약분석 결과
      const contractData = data as Record<string, unknown>;
      report.contractRisk = {
        riskClauses: (contractData.riskClauseCount as number) || 0,
        missingClauses: (contractData.missingClauseCount as number) || 0,
        overallRisk:
          (contractData.overallRisk as "low" | "medium" | "high") || "medium",
        highlights: (contractData.highlights as string[]) || [],
      };
    }

    if (analysis.type === "predict-value") {
      // 시세분석 결과
      const prediction = data as Record<string, unknown>;
      report.priceAnalysis = {
        currentEstimate: (prediction.currentEstimate as number) || 0,
        scenarioOptimistic: (prediction.optimistic as number) || 0,
        scenarioBase: (prediction.base as number) || 0,
        scenarioPessimistic: (prediction.pessimistic as number) || 0,
        confidence: (prediction.confidence as number) || 0.5,
      };
    }
  }

  // 동적 체크리스트 생성
  report.checklist = report.registryRisk
    ? generateChecklist(report.registryRisk.score)
    : [];

  // V-Score 통합 위험도 산출
  const vScoreInput: VScoreInput = {
    riskScore: report.registryRisk?.score,
    jeonseRatio: report.propertyInfo?.jeonseRatio,
  };

  // 계약분석 결과가 있으면 V-Score에 반영
  if (report.contractRisk) {
    // ContractAnalysisResult 형태로 변환
    vScoreInput.contractResult = {
      clauses: [],
      missingClauses: [],
      safetyScore: report.contractRisk.overallRisk === "low" ? 90
        : report.contractRisk.overallRisk === "medium" ? 60 : 30,
    };
  }

  // 시세분석 결과가 있으면 V-Score에 반영
  if (report.priceAnalysis) {
    vScoreInput.priceConfidence = report.priceAnalysis.confidence;
  }

  const vScore = calculateVScore(vScoreInput);
  report.vScore = vScore;

  // 종합 등급: V-Score 기반 (V-Score 없으면 기존 로직 폴백)
  const grade = vScore.grade;
  const score = vScore.score;
  report.overallGrade = grade;
  report.overallScore = score;

  // 권고사항 생성
  report.recommendations = generateRecommendations(report);

  // 요약문 생성
  report.summary = generateSummary(report as IntegratedReportData);

  return report as IntegratedReportData;
}

function generateSummary(report: IntegratedReportData): string {
  const parts: string[] = [];
  const gradeLabels: Record<RiskGrade, string> = {
    A: "안전",
    B: "양호",
    C: "주의",
    D: "위험",
    F: "매우위험",
  };

  parts.push(
    `${report.propertyInfo.address} — 종합 위험등급 ${report.overallGrade}등급(${gradeLabels[report.overallGrade]}, ${report.overallScore}점).`
  );

  if (report.registryRisk) {
    parts.push(
      `등기 위험요소 ${report.registryRisk.factorCount}건 (심각 ${report.registryRisk.criticalCount}건).`
    );
  }

  if (report.contractRisk) {
    parts.push(
      `계약서 위험조항 ${report.contractRisk.riskClauses}건, 누락항목 ${report.contractRisk.missingClauses}건.`
    );
  }

  parts.push(`확인 필요 서류 ${report.checklist.length}건.`);

  return parts.join(" ");
}
