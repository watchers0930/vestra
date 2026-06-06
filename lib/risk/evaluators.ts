/**
 * 리스크 스코어링 — 개별 평가 함수 모음
 *
 * @module lib/risk/evaluators
 */

import type { ParsedRegistry } from "../registry-parser";
import type { RiskFactor } from "../risk-scoring";
import { dateToMonths, monthsBetween } from "./temporal-detector";

// ─── 근저당 비율 ───

export function evaluateMortgageRatio(
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

// ─── 압류/가압류 ───

export function evaluateSeizure(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 가처분 ───

export function evaluateDisposition(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 경매 ───

export function evaluateAuction(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 가등기 ───

export function evaluateProvisionalRegistration(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 신탁 ───

export function evaluateTrust(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 소유권 이전 빈도 ───

export function evaluateOwnershipFrequency(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  const transfers = parsed.gapgu
    .filter((e) => e.purpose === "소유권이전" && !e.isCancelled && e.date)
    .sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));

  const count = transfers.length;
  if (count < 2) return factors;

  const spanMonths = monthsBetween(transfers[0].date, transfers[count - 1].date);
  const spanYears = Math.max(spanMonths / 12, 1);
  const avgPerYear = count / spanYears;

  if (avgPerYear >= 1) {
    factors.push({
      id: "ownership_freq_high",
      category: "소유권",
      description: "소유권 이전 빈도 매우 높음",
      deduction: 15,
      severity: "high",
      detail: `${Math.round(spanYears)}년간 소유권이 ${count}회 이전(연평균 ${avgPerYear.toFixed(1)}회)되었습니다. 잦은 거래는 투기 또는 하자 물건의 징후일 수 있습니다.`,
    });
  } else if (avgPerYear >= 0.5) {
    factors.push({
      id: "ownership_freq",
      category: "소유권",
      description: "소유권 이전 빈도 높음",
      deduction: 10,
      severity: "medium",
      detail: `${Math.round(spanYears)}년간 소유권이 ${count}회 이전(연평균 ${avgPerYear.toFixed(1)}회)되었습니다. 평균 이상의 거래 빈도로 주의가 필요합니다.`,
    });
  }

  return factors;
}

// ─── 선순위채권 합산 ───

export function evaluateTotalClaims(
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

// ─── 임차권등기 ───

export function evaluateLeaseRegistration(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 예고등기 ───

export function evaluateWarningRegistration(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 환매등기 ───

export function evaluateRedemption(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 다수 근저당 ───

export function evaluateMultipleMortgages(parsed: ParsedRegistry): RiskFactor[] {
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

// ─── 용도 불일치 ───

export function evaluatePropertyPurpose(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const purpose = parsed.title?.purpose || "";

  if (!purpose) return factors;

  const nonResidential = /근린생활시설|업무시설|제[12]종근린생활시설/.test(purpose);

  if (nonResidential) {
    factors.push({
      id: "non_residential_purpose",
      category: "용도",
      description: "등기부상 비주거용 건물",
      deduction: 15,
      severity: "high",
      detail: `등기부상 용도가 '${purpose}'입니다. 비주거용 건물은 전세자금 대출이 거부될 수 있으며, 전입신고 및 확정일자가 불가하여 주택임대차보호법에 의한 보호를 받지 못할 수 있습니다. 실제 용도와 등기부 용도가 일치하는지 반드시 확인하세요.`,
    });
  }

  return factors;
}
