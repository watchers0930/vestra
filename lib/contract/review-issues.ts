/**
 * VESTRA 계약서 분석 — 검토 이슈 & 안전점수
 * ──────────────────────────────────────────────────────────────
 * 추출 정보·누락 조항·본문을 바탕으로 리스크 이슈를 도출하고,
 * 특허 V-Score 수식으로 안전점수를 계산한다. contract-analyzer에서 추출(동작 변경 없음).
 */

import type {
  AnalyzedClause,
  ContractExtractedInfo,
  ContractReviewIssue,
  MissingClause,
} from "./types";

function hasMissing(missingClauses: MissingClause[], keyword: string): boolean {
  return missingClauses.some((item) => item.title.includes(keyword));
}

export function buildReviewIssues(
  text: string,
  info: ContractExtractedInfo,
  missingClauses: MissingClause[],
): ContractReviewIssue[] {
  const issues: ContractReviewIssue[] = [];

  if (!info.propertyAddress) {
    issues.push({
      id: "missing_property_address",
      severity: "high",
      title: "목적물 주소 확인 필요",
      description: "계약서에서 목적물 주소를 명확히 추출하지 못했습니다.",
      recommendation: "등기부등본, 건축물대장, 계약서의 주소와 호수를 동일하게 맞추세요.",
    });
  }
  if (!info.landlordName || !info.tenantName) {
    issues.push({
      id: "missing_party_identity",
      severity: "warning",
      title: "당사자 표시 보완 필요",
      description: "임대인 또는 임차인 성명이 명확하지 않습니다.",
      recommendation: "신분증, 등기부 소유자명, 계약서 임대인명이 일치하는지 확인하세요.",
    });
  }
  if (!info.depositAmount) {
    issues.push({
      id: "missing_deposit",
      severity: "critical",
      title: "보증금 금액 확인 필요",
      description: "보증금 금액을 명확히 추출하지 못했습니다.",
      recommendation: "보증금, 계약금, 중도금, 잔금 금액과 지급일을 숫자와 한글 병기로 명시하세요.",
    });
  }
  if (info.durationMonths !== undefined && info.durationMonths < 24) {
    issues.push({
      id: "short_lease_period",
      severity: "warning",
      title: "임대차 기간이 2년 미만입니다",
      description: `계약기간이 약 ${info.durationMonths}개월로 추출되었습니다.`,
      recommendation: "주택임대차보호법상 임차인은 2년 기간을 주장할 수 있으므로 계약서 문구를 재확인하세요.",
    });
  }
  if (!/보증금\s*반환[\s\S]{0,40}(기한|기일|이내|동시|즉시|반환일|개월|일)/.test(text)) {
    issues.push({
      id: "missing_deposit_return_deadline",
      severity: "high",
      title: "보증금 반환 시점이 불명확합니다",
      description: "계약 종료 또는 명도와 동시에 보증금을 언제 반환하는지 명확하지 않습니다.",
      recommendation: "계약 종료일 또는 목적물 인도와 동시에 반환한다는 문구와 지연손해금 기준을 넣으세요.",
    });
  }
  if ((info.depositAmount || 0) >= 300_000_000 && hasMissing(missingClauses, "보증금보호")) {
    issues.push({
      id: "high_deposit_no_guarantee",
      severity: "critical",
      title: "고액 보증금 보호장치가 부족합니다",
      description: "3억원 이상 보증금인데 전세보증금반환보증 관련 조항이 확인되지 않았습니다.",
      recommendation: "HUG/SGI 보증 가입 협조, 가입 불가 시 계약 해제 및 계약금 반환 특약을 추가하세요.",
    });
  }
  if (hasMissing(missingClauses, "등기 상태")) {
    issues.push({
      id: "missing_registry_freeze",
      severity: "high",
      title: "잔금 전 등기변동 방지 특약이 없습니다",
      description: "계약 후 잔금일까지 근저당, 가압류, 소유권 이전 등 권리 변동을 제한하는 문구가 필요합니다.",
      recommendation: "잔금일까지 등기부 현 상태 유지, 위반 시 계약 해제 및 배액 배상 특약을 넣으세요.",
    });
  }
  if (hasMissing(missingClauses, "세금 체납")) {
    issues.push({
      id: "missing_tax_clearance",
      severity: "high",
      title: "국세·지방세 체납 확인 조항이 없습니다",
      description: "당해세 등 체납 세금은 보증금 회수에 직접 영향을 줄 수 있습니다.",
      recommendation: "임대인의 국세·지방세 완납증명원 제출 및 체납 발견 시 계약 해제 특약을 추가하세요.",
    });
  }
  if (!/(전입\s*신고|확정\s*일자|입주\s*즉시)/.test(text)) {
    issues.push({
      id: "missing_movein_fixed_date",
      severity: "warning",
      title: "전입신고·확정일자 절차가 약합니다",
      description: "입주 직후 대항력과 우선변제권 확보 절차가 명확히 보이지 않습니다.",
      recommendation: "입주 즉시 전입신고와 확정일자를 진행하고, 임대인이 이에 필요한 서류에 협조하도록 명시하세요.",
    });
  }

  return issues;
}

/** 안전점수 계산 (조항 상호작용 감점 포함) — 특허 V-Score 수식 */
export function calculateSafetyScore(
  clauses: AnalyzedClause[],
  missingClauses: MissingClause[],
  reviewIssues: ContractReviewIssue[] = [],
  interactionImpact: number = 0,
): number {
  let score = 100;

  for (const clause of clauses) {
    if (clause.riskLevel === "high") score -= 15;
    else if (clause.riskLevel === "warning") score -= 5;
  }

  for (const mc of missingClauses) {
    if (mc.importance === "high") score -= 5;
    else score -= 2;
  }

  // 조항 상호작용에 의한 비선형 추가 감점
  score -= interactionImpact;

  for (const issue of reviewIssues) {
    if (issue.severity === "critical") score -= 3;
    else if (issue.severity === "high") score -= 2;
    else if (issue.severity === "warning") score -= 1;
  }

  return Math.max(0, Math.min(100, score));
}
