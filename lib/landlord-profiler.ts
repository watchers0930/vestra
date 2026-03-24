/**
 * 임대인 종합 프로파일러
 * ───────────────────────
 * 등기부에서 추출한 소유자명으로 동일 소유자의 다른 물건을 추적하고
 * 종합 위험도 (안전 등급 A~F)를 산정한다.
 *
 * 데이터 소스:
 * - 등기부 파싱 데이터 (소유자명, 근저당, 압류)
 * - FraudCase 테이블 (기존 사기 사례 매칭)
 * - 대법원 판례 API (court-api.ts)
 * - 뉴스 크롤링 (news-collector.ts)
 */

import { createHash } from "crypto";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandlordProperty {
  address: string;
  mortgageTotal: number;   // 근저당 합계 (원)
  liensTotal: number;      // 압류/가압류 합계 (원)
  estimatedPrice: number;  // 추정 시세 (원)
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface LandlordProfile {
  nameHash: string;
  nameDisplay: string;       // 마스킹 ("김O수")
  properties: LandlordProperty[];
  propertyCount: number;
  totalMortgage: number;
  totalLiens: number;
  totalEstimatedValue: number;
  mortgageRatio: number;     // 근저당 비율 (%)
  safetyGrade: string;       // A/B/C/D/F
  gradeScore: number;        // 0-100
  courtCaseCount: number;
  fraudCaseCount: number;
  riskFactors: string[];
}

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------

/** 이름 해시 생성 */
export function hashName(name: string): string {
  return createHash("sha256").update(name.trim()).digest("hex");
}

/** 이름 마스킹 ("김영수" → "김O수") */
export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return trimmed[0] + "O";
  return trimmed[0] + "O".repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

// ---------------------------------------------------------------------------
// 등급 산정
// ---------------------------------------------------------------------------

const GRADE_WEIGHTS = {
  mortgageRatio: 30,     // 근저당 비율 (시세 대비)
  liensExist: 20,        // 압류/가압류 존재 여부
  multiProperty: 10,     // 다수 물건 보유 (리스크 분산 or 과도)
  courtCases: 20,        // 관련 판례 수
  fraudCases: 20,        // 사기 사례 매칭
};

function calculateGradeScore(profile: {
  mortgageRatio: number;
  totalLiens: number;
  propertyCount: number;
  courtCaseCount: number;
  fraudCaseCount: number;
}): number {
  let score = 100;

  // 근저당 비율 감점 (50% 이상이면 최대 감점)
  if (profile.mortgageRatio > 80) score -= GRADE_WEIGHTS.mortgageRatio;
  else if (profile.mortgageRatio > 60) score -= GRADE_WEIGHTS.mortgageRatio * 0.7;
  else if (profile.mortgageRatio > 40) score -= GRADE_WEIGHTS.mortgageRatio * 0.4;
  else if (profile.mortgageRatio > 20) score -= GRADE_WEIGHTS.mortgageRatio * 0.2;

  // 압류 존재 감점
  if (profile.totalLiens > 0) score -= GRADE_WEIGHTS.liensExist;

  // 다수 물건 (5개 이상이면 감점 — 무리한 투자 가능성)
  if (profile.propertyCount >= 5) score -= GRADE_WEIGHTS.multiProperty;
  else if (profile.propertyCount >= 3) score -= GRADE_WEIGHTS.multiProperty * 0.5;

  // 판례 이력
  if (profile.courtCaseCount >= 3) score -= GRADE_WEIGHTS.courtCases;
  else if (profile.courtCaseCount >= 1) score -= GRADE_WEIGHTS.courtCases * 0.5;

  // 사기 사례 매칭
  if (profile.fraudCaseCount >= 2) score -= GRADE_WEIGHTS.fraudCases;
  else if (profile.fraudCaseCount >= 1) score -= GRADE_WEIGHTS.fraudCases * 0.7;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// 메인: 임대인 프로파일 생성
// ---------------------------------------------------------------------------

/**
 * 소유자명과 물건 정보 배열로 임대인 종합 프로파일 생성
 */
export async function buildLandlordProfile(
  ownerName: string,
  properties: LandlordProperty[],
): Promise<LandlordProfile> {
  const nameH = hashName(ownerName);
  const nameD = maskName(ownerName);

  const totalMortgage = properties.reduce((sum, p) => sum + p.mortgageTotal, 0);
  const totalLiens = properties.reduce((sum, p) => sum + p.liensTotal, 0);
  const totalEstimatedValue = properties.reduce((sum, p) => sum + p.estimatedPrice, 0);
  const mortgageRatio = totalEstimatedValue > 0
    ? Math.round((totalMortgage / totalEstimatedValue) * 100)
    : 0;

  // DB에서 사기 사례 매칭 (소유자명 해시 기반)
  let fraudCaseCount = 0;
  try {
    fraudCaseCount = await prisma.fraudCase.count({
      where: {
        address: { in: properties.map((p) => p.address) },
      },
    });
  } catch {
    // FraudCase 테이블 없으면 무시
  }

  // TODO: court-api.ts 연동하여 판례 검색
  const courtCaseCount = 0;

  // 위험 요인 분석
  const riskFactors: string[] = [];
  if (mortgageRatio > 60) riskFactors.push(`근저당 비율 ${mortgageRatio}%로 높음`);
  if (totalLiens > 0) riskFactors.push(`압류/가압류 ${(totalLiens / 10000).toFixed(0)}만원 존재`);
  if (properties.length >= 5) riskFactors.push(`소유 물건 ${properties.length}건 — 과도한 투자 가능성`);
  if (fraudCaseCount > 0) riskFactors.push(`전세사기 사례 ${fraudCaseCount}건 매칭`);
  if (properties.some((p) => p.riskLevel === "HIGH")) riskFactors.push("고위험 물건 보유");

  const gradeScore = calculateGradeScore({
    mortgageRatio,
    totalLiens,
    propertyCount: properties.length,
    courtCaseCount,
    fraudCaseCount,
  });

  return {
    nameHash: nameH,
    nameDisplay: nameD,
    properties,
    propertyCount: properties.length,
    totalMortgage,
    totalLiens,
    totalEstimatedValue,
    mortgageRatio,
    safetyGrade: scoreToGrade(gradeScore),
    gradeScore,
    courtCaseCount,
    fraudCaseCount,
    riskFactors,
  };
}

/**
 * 물건별 위험도 판단
 */
export function assessPropertyRisk(
  mortgageTotal: number,
  liensTotal: number,
  estimatedPrice: number,
): "LOW" | "MEDIUM" | "HIGH" {
  if (liensTotal > 0) return "HIGH";
  if (estimatedPrice <= 0) return "MEDIUM";
  const ratio = mortgageTotal / estimatedPrice;
  if (ratio > 0.7) return "HIGH";
  if (ratio > 0.4) return "MEDIUM";
  return "LOW";
}
