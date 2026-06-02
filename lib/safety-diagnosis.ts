/**
 * VESTRA 8대 안전진단 엔진
 * ─────────────────────────
 * 기존 RiskScore + ParsedRegistry + TemporalPatterns에서
 * 8개 진단 항목을 추출하는 순수 함수.
 */

import type { ParsedRegistry } from "./registry-parser";
import type { RiskScore } from "./risk-scoring";

// ─── 타입 정의 ───

export interface DiagnosisItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unknown";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  action: string;
  evidence?: string[];
}

export interface SafetyDiagnosisResult {
  items: DiagnosisItem[];
  passCount: number;
  warnCount: number;
  failCount: number;
  unknownCount: number;
  overallStatus: "safe" | "caution" | "danger";
}

// ─── 진단 함수 ───

/** 1. 말소항 확인 — 의심스러운 말소 패턴 탐지 */
function diagnoseCancellationHistory(
  riskScore: RiskScore,
): DiagnosisItem {
  const temporalPatterns = riskScore.temporalPatterns?.patterns || [];

  const suspiciousPatterns = temporalPatterns.filter(
    (p) =>
      p.patternType === "suspicious_cancellation" ||
      p.patternType === "cancel_before_sale" ||
      p.patternType === "simultaneous_cancellation" ||
      p.patternType === "cancel_without_transfer"
  );

  if (suspiciousPatterns.length === 0) {
    return {
      id: "cancellation_history",
      label: "말소항 이력 분석",
      status: "pass",
      severity: "low",
      description: "의심스러운 근저당 말소 패턴이 발견되지 않았습니다.",
      action: "추가 확인 불필요",
    };
  }

  const hasCritical = suspiciousPatterns.some((p) => p.severity === "critical");

  return {
    id: "cancellation_history",
    label: "말소항 이력 분석",
    status: hasCritical ? "fail" : "warn",
    severity: hasCritical ? "critical" : "high",
    description: `의심스러운 말소 패턴 ${suspiciousPatterns.length}건 감지. ${suspiciousPatterns[0].description}`,
    action: "해당 금융기관에 직접 연락하여 정상 상환 여부를 확인하세요. 말소 서류 위조 가능성이 있습니다.",
    evidence: suspiciousPatterns.map((p) => p.description),
  };
}

/** 2. 표제부 용도 확인 — 건축물대장 교차검증 */
function diagnosePurposeMismatch(
  parsed: ParsedRegistry,
  buildingPurpose?: string,
): DiagnosisItem {
  const registryPurpose = parsed.title?.purpose || "";

  if (!registryPurpose) {
    return {
      id: "purpose_check",
      label: "표제부 용도 확인",
      status: "unknown",
      severity: "medium",
      description: "등기부에서 용도를 확인할 수 없습니다.",
      action: "건축물대장을 발급하여 실제 용도를 확인하세요.",
    };
  }

  const nonResidential = /근린생활시설|업무시설|제[12]종근린생활시설/.test(registryPurpose);

  if (nonResidential) {
    return {
      id: "purpose_check",
      label: "표제부 용도 확인",
      status: "fail",
      severity: "high",
      description: `등기부상 용도가 '${registryPurpose}'입니다. 주택임대차보호법 미적용 위험이 있습니다.`,
      action: "건축물대장을 발급하여 실제 용도와 등기부 용도가 일치하는지 확인하세요. 비주거용 건물은 전입신고·확정일자가 불가합니다.",
      evidence: [`등기부 용도: ${registryPurpose}`],
    };
  }

  // 건축물대장 용도와 비교
  if (buildingPurpose && buildingPurpose !== registryPurpose) {
    const isMajorDiff = /근린생활시설|업무시설/.test(buildingPurpose) ||
      /근린생활시설|업무시설/.test(registryPurpose);

    return {
      id: "purpose_check",
      label: "표제부 용도 확인",
      status: isMajorDiff ? "fail" : "warn",
      severity: isMajorDiff ? "high" : "medium",
      description: `등기부 용도(${registryPurpose})와 건축물대장 용도(${buildingPurpose})가 다릅니다.`,
      action: "용도 불일치는 불법 용도변경 가능성이 있습니다. 해당 구청 건축과에 확인하세요.",
      evidence: [
        `등기부 용도: ${registryPurpose}`,
        `건축물대장 용도: ${buildingPurpose}`,
      ],
    };
  }

  return {
    id: "purpose_check",
    label: "표제부 용도 확인",
    status: "pass",
    severity: "low",
    description: `등기부상 용도 '${registryPurpose}' — 주거용으로 확인됩니다.`,
    action: "건축물대장과 교차검증을 권장합니다.",
  };
}

/** 3. 소유자명 대조 */
function diagnoseOwnerVerification(
  parsed: ParsedRegistry,
): DiagnosisItem {
  const owners = parsed.gapgu
    .filter((e) => e.purpose === "소유권이전" && !e.isCancelled)
    .sort((a, b) => {
      const dateA = a.date.replace(/\./g, "");
      const dateB = b.date.replace(/\./g, "");
      return dateB.localeCompare(dateA);
    });

  const currentOwner = owners[0]?.holder || "";

  if (!currentOwner) {
    return {
      id: "owner_verification",
      label: "소유자명 대조",
      status: "unknown",
      severity: "medium",
      description: "등기부에서 현재 소유자를 확인할 수 없습니다.",
      action: "등기부등본을 재확인하고, 매도인 신분증과 대조하세요.",
    };
  }

  return {
    id: "owner_verification",
    label: "소유자명 대조",
    status: "warn",
    severity: "medium",
    description: `현재 소유자: ${currentOwner}. 반드시 매도인 신분증과 대조해야 합니다.`,
    action: "매도인 신분증의 이름·주민번호를 등기부 소유자와 직접 대조하세요. 대리인 계약 시 위임장·인감증명서를 확인하세요.",
    evidence: [`등기부 소유자: ${currentOwner}`],
  };
}

/** 4. 갑구 위험단어 확인 */
function diagnoseDangerKeywords(
  parsed: ParsedRegistry,
): DiagnosisItem {
  const {
    hasSeizure,
    hasProvisionalSeizure,
    hasProvisionalDisposition,
    hasProvisionalRegistration,
    hasWarningRegistration,
  } = parsed.summary;

  const dangers: string[] = [];
  if (hasSeizure) dangers.push("압류");
  if (hasProvisionalSeizure) dangers.push("가압류");
  if (hasProvisionalDisposition) dangers.push("가처분");
  if (hasProvisionalRegistration) dangers.push("가등기");
  if (hasWarningRegistration) dangers.push("예고등기");

  if (dangers.length === 0) {
    return {
      id: "danger_keywords",
      label: "갑구 위험등기 확인",
      status: "pass",
      severity: "low",
      description: "압류·가압류·가처분·가등기·예고등기가 없습니다.",
      action: "추가 확인 불필요",
    };
  }

  const hasCritical = hasSeizure || hasProvisionalSeizure;

  return {
    id: "danger_keywords",
    label: "갑구 위험등기 확인",
    status: "fail",
    severity: hasCritical ? "critical" : "high",
    description: `위험 등기 발견: ${dangers.join(", ")}`,
    action: `${dangers.join("/")}이 설정된 부동산은 소유권 행사에 심각한 제한이 있습니다. 법률 전문가와 상담 후 계약을 진행하세요.`,
    evidence: dangers.map((d) => `${d} 등기 존재`),
  };
}

/** 5. 채권최고액 과다대출 확인 */
function diagnoseMortgageOverload(
  parsed: ParsedRegistry,
  riskScore: RiskScore,
  estimatedPrice: number,
): DiagnosisItem {
  const { totalMortgageAmount, totalClaimsAmount } = parsed.summary;

  if (!estimatedPrice || estimatedPrice <= 0) {
    return {
      id: "mortgage_overload",
      label: "채권최고액 과다대출",
      status: "unknown",
      severity: "medium",
      description: "추정 시세가 없어 채권최고액 비율을 계산할 수 없습니다.",
      action: "KB시세, 네이버부동산 등에서 시세를 확인한 후 비교하세요.",
    };
  }

  // 실대출금 역산 (채권최고액 ÷ 1.2 = 실제 대출 추정)
  const estimatedActualLoan = Math.round(totalMortgageAmount / 1.2);
  const mortgageRatio = riskScore.mortgageRatio;
  const totalClaimsRatio = (totalClaimsAmount / estimatedPrice) * 100;

  const eokMortgage = (totalMortgageAmount / 100_000_000).toFixed(1);
  const eokActualLoan = (estimatedActualLoan / 100_000_000).toFixed(1);
  const eokPrice = (estimatedPrice / 100_000_000).toFixed(1);

  if (totalClaimsRatio > 80) {
    return {
      id: "mortgage_overload",
      label: "채권최고액 과다대출",
      status: "fail",
      severity: "critical",
      description: `채권최고액 ${eokMortgage}억 (실대출 추정 ${eokActualLoan}억) — 시세 ${eokPrice}억 대비 ${mortgageRatio.toFixed(1)}%`,
      action: `선순위 채권 합산이 시세의 ${totalClaimsRatio.toFixed(0)}%입니다. 경매 시 보증금 전액 회수가 어렵습니다. 깡통주택 위험이 매우 높으므로 계약을 재고하세요.`,
      evidence: [
        `채권최고액 합계: ${eokMortgage}억원`,
        `실대출금 추정(÷1.2): ${eokActualLoan}억원`,
        `시세 대비 비율: ${mortgageRatio.toFixed(1)}%`,
      ],
    };
  }

  if (mortgageRatio > 50) {
    return {
      id: "mortgage_overload",
      label: "채권최고액 과다대출",
      status: "warn",
      severity: "high",
      description: `채권최고액 ${eokMortgage}억 (실대출 추정 ${eokActualLoan}억) — 시세 ${eokPrice}억 대비 ${mortgageRatio.toFixed(1)}%`,
      action: "근저당 설정 금융기관에 실제 대출 잔액을 확인하세요. 채권최고액은 실제 대출금의 약 120%로 설정됩니다.",
      evidence: [
        `채권최고액 합계: ${eokMortgage}억원`,
        `실대출금 추정(÷1.2): ${eokActualLoan}억원`,
      ],
    };
  }

  return {
    id: "mortgage_overload",
    label: "채권최고액 과다대출",
    status: "pass",
    severity: "low",
    description: `채권최고액 ${eokMortgage}억 (실대출 추정 ${eokActualLoan}억) — 시세 대비 ${mortgageRatio.toFixed(1)}%로 안전 범위`,
    action: "근저당 비율이 양호합니다. 다만 거래 당일 등기부를 재확인하세요.",
  };
}

/** 6. 임차권등기 확인 */
function diagnoseLeaseRegistration(
  parsed: ParsedRegistry,
): DiagnosisItem {
  if (!parsed.summary.hasLeaseRegistration) {
    return {
      id: "lease_registration",
      label: "임차권등기 확인",
      status: "pass",
      severity: "low",
      description: "임차권등기명령이 없습니다.",
      action: "추가 확인 불필요",
    };
  }

  const leaseCount = parsed.eulgu.filter(
    (e) => /임차권등기|임차권설정/.test(e.purpose) && !e.isCancelled
  ).length;

  return {
    id: "lease_registration",
    label: "임차권등기 확인",
    status: "fail",
    severity: "critical",
    description: `임차권등기 ${leaseCount}건 — 이전 임차인이 보증금을 반환받지 못한 이력입니다.`,
    action: "임차권등기는 보증금 미반환의 직접적 증거입니다. 해당 물건에 신규 임대차 계약은 매우 위험합니다.",
    evidence: [`임차권등기 ${leaseCount}건 존재`],
  };
}

/** 7. 세금 체납 확인 안내 */
function diagnoseTaxDelinquency(): DiagnosisItem {
  return {
    id: "tax_delinquency",
    label: "세금 체납 확인",
    status: "warn",
    severity: "medium",
    description: "매도인의 세금 체납 여부는 등기부만으로 확인할 수 없습니다.",
    action: "정부24(gov.kr)에서 '지방세 납세증명서'와 '국세 납세증명서'를 요청하세요. 체납 시 매매 후에도 압류가 발생할 수 있습니다.",
  };
}

/** 8. 신탁 등기 확인 */
function diagnoseTrust(
  parsed: ParsedRegistry,
): DiagnosisItem {
  if (!parsed.summary.hasTrust) {
    return {
      id: "trust_check",
      label: "신탁등기 확인",
      status: "pass",
      severity: "low",
      description: "신탁등기가 없습니다.",
      action: "추가 확인 불필요",
    };
  }

  return {
    id: "trust_check",
    label: "신탁등기 확인",
    status: "fail",
    severity: "critical",
    description: "신탁등기 설정 — 수탁자(신탁회사)만이 유효한 처분 권한을 가집니다.",
    action: "반드시 신탁회사와 직접 계약해야 합니다. 위탁자(소유자)와만 계약하면 무효입니다. 신탁원부를 열람하여 수익자·우선수익자를 확인하세요.",
    evidence: ["신탁등기 존재 — 위탁자와의 직접 계약은 무효"],
  };
}

// ─── 메인 진단 함수 ───

export function runSafetyDiagnosis(
  parsed: ParsedRegistry,
  riskScore: RiskScore,
  estimatedPrice: number,
  buildingPurpose?: string,
): SafetyDiagnosisResult {
  const items: DiagnosisItem[] = [
    diagnoseCancellationHistory(riskScore),
    diagnosePurposeMismatch(parsed, buildingPurpose),
    diagnoseOwnerVerification(parsed),
    diagnoseDangerKeywords(parsed),
    diagnoseMortgageOverload(parsed, riskScore, estimatedPrice),
    diagnoseLeaseRegistration(parsed),
    diagnoseTaxDelinquency(),
    diagnoseTrust(parsed),
  ];

  const passCount = items.filter((i) => i.status === "pass").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const failCount = items.filter((i) => i.status === "fail").length;
  const unknownCount = items.filter((i) => i.status === "unknown").length;

  let overallStatus: "safe" | "caution" | "danger" = "safe";
  if (failCount > 0) overallStatus = "danger";
  else if (warnCount > 0 || unknownCount > 0) overallStatus = "caution";

  return { items, passCount, warnCount, failCount, unknownCount, overallStatus };
}
