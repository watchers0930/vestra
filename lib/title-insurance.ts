/**
 * VESTRA 권원보험(Title Insurance) 판정 엔진
 * ──────────────────────────────────────────────
 * 매매가 기반 예상 보험료 계산 + 가입 권고도 판정.
 */

import type { RiskScore } from "./risk-scoring";

// ─── 타입 정의 ───

export interface TitleInsurancePremium {
  salePrice: number;
  premiumRate: number;       // 0.03~0.05% (고위험 시 할증)
  estimatedPremium: number;  // 예상 보험료 (원)
  premiumRange: {
    min: number;
    max: number;
  };
}

export type InsuranceRecommendation = "required" | "recommended" | "optional";

export interface CoverageItem {
  id: string;
  name: string;
  description: string;
  covered: boolean;
}

export interface TitleInsuranceResult {
  premium: TitleInsurancePremium;
  recommendation: InsuranceRecommendation;
  recommendationLabel: string;
  recommendationReason: string;
  coverageItems: CoverageItem[];
  providers: InsuranceProvider[];
}

export interface InsuranceProvider {
  name: string;
  description: string;
  phone?: string;
  website?: string;
}

// ─── 보장 범위 ───

const COVERAGE_ITEMS: CoverageItem[] = [
  {
    id: "forgery",
    name: "서류 위조",
    description: "등기 관련 서류(말소 서류, 위임장 등)의 위조로 인한 손해",
    covered: true,
  },
  {
    id: "double_sale",
    name: "이중매매",
    description: "동일 부동산을 여러 사람에게 매도하여 발생하는 손해",
    covered: true,
  },
  {
    id: "unauthorized_agent",
    name: "무권대리",
    description: "권한 없는 대리인이 체결한 계약으로 인한 손해",
    covered: true,
  },
  {
    id: "hidden_lien",
    name: "숨겨진 담보권",
    description: "거래 시점에 발견되지 않은 근저당·압류 등 담보권",
    covered: true,
  },
  {
    id: "ownership_dispute",
    name: "소유권 분쟁",
    description: "상속·증여 관련 소유권 분쟁으로 인한 손해",
    covered: true,
  },
  {
    id: "registry_error",
    name: "등기부 오류",
    description: "등기관의 과실로 인한 등기부 기재 오류",
    covered: true,
  },
];

// ─── 보험사 정보 ───

const PROVIDERS: InsuranceProvider[] = [
  {
    name: "스튜어트 타이틀 (한국)",
    description: "미국 최대 권원보험사의 한국 지사. 국제 거래에 강점.",
    website: "https://www.stewart.com",
  },
  {
    name: "퍼스트 아메리칸 (한국)",
    description: "미국 3대 권원보험사. 주거용 부동산 권원보험 전문.",
    website: "https://www.firstam.com",
  },
  {
    name: "국내 보험사 (법률비용보험)",
    description: "국내 손해보험사의 법률비용보험으로 유사 보장 가능.",
  },
];

// ─── 보험료 계산 ───

export function calculateTitleInsurancePremium(
  salePrice: number,
  riskGrade?: string,
): TitleInsurancePremium {
  // 기본 요율: 매매가의 0.03~0.05%
  let baseRate = 0.0004; // 0.04%

  // 위험등급에 따른 요율 조정
  if (riskGrade === "D" || riskGrade === "F") {
    baseRate = 0.0005; // 0.05%
  } else if (riskGrade === "A") {
    baseRate = 0.0003; // 0.03%
  }

  const estimatedPremium = Math.round(salePrice * baseRate);

  return {
    salePrice,
    premiumRate: baseRate * 100,
    estimatedPremium,
    premiumRange: {
      min: Math.round(salePrice * 0.0003),
      max: Math.round(salePrice * 0.0005),
    },
  };
}

// ─── 가입 권고도 판정 ───

export function getTitleInsuranceRecommendation(
  riskScore: RiskScore,
): { recommendation: InsuranceRecommendation; label: string; reason: string } {
  const { totalScore, grade, factors } = riskScore;
  const temporalPatterns = riskScore.temporalPatterns?.patterns || [];

  // 말소 위조 의심 패턴 존재 → 필수
  const hasSuspiciousCancellation = temporalPatterns.some(
    (p) =>
      p.patternType === "suspicious_cancellation" ||
      p.patternType === "cancel_before_sale" ||
      p.patternType === "simultaneous_cancellation"
  );

  // 신탁·가등기·가처분 존재 → 필수
  const hasComplexRights = factors.some(
    (f) => f.id === "trust" || f.id === "provisional_reg" || f.id === "disposition"
  );

  if (hasSuspiciousCancellation || hasComplexRights || grade === "F") {
    return {
      recommendation: "required",
      label: "가입 강력 권고",
      reason: hasSuspiciousCancellation
        ? "말소 서류 위조 의심 패턴이 감지되었습니다. 권원보험으로 위조 피해를 보장받을 수 있습니다."
        : hasComplexRights
          ? "복잡한 권리관계(신탁/가등기/가처분)가 존재합니다. 소유권 분쟁 위험에 대비하세요."
          : "종합 위험등급이 F(매우위험)입니다. 권원보험 가입을 강력히 권고합니다.",
    };
  }

  if (totalScore < 70 || grade === "D") {
    return {
      recommendation: "recommended",
      label: "가입 권장",
      reason: "위험요소가 감지되어 권원보험 가입을 권장합니다. 예상치 못한 권리 하자에 대비할 수 있습니다.",
    };
  }

  return {
    recommendation: "optional",
    label: "선택 가입",
    reason: "현재 등기부상 특별한 위험이 없으나, 서류 위조·이중매매 등 예측 불가능한 위험에 대비하여 가입을 고려할 수 있습니다.",
  };
}

// ─── 통합 결과 생성 ───

export function evaluateTitleInsurance(
  salePrice: number,
  riskScore: RiskScore,
): TitleInsuranceResult {
  const premium = calculateTitleInsurancePremium(salePrice, riskScore.grade);
  const { recommendation, label, reason } = getTitleInsuranceRecommendation(riskScore);

  return {
    premium,
    recommendation,
    recommendationLabel: label,
    recommendationReason: reason,
    coverageItems: COVERAGE_ITEMS,
    providers: PROVIDERS,
  };
}
