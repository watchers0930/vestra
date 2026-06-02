/**
 * VESTRA 매매계약 특약 동적 생성 엔진
 * ──────────────────────────────────────
 * 위험요소 기반으로 매매계약서 특약 조항을 자동 생성.
 */

import type { RiskScore } from "./risk-scoring";
import type { ParsedRegistry } from "./registry-parser";

// ─── 타입 정의 ───

export interface ContractClause {
  id: string;
  category: "기본" | "근저당" | "신탁" | "가등기" | "압류" | "임차권" | "용도" | "기타";
  title: string;
  text: string;
  triggeredBy: string; // 어떤 위험요소로 인해 생성되었는지
  priority: "required" | "recommended";
}

export interface ContractClauseResult {
  clauses: ContractClause[];
  requiredCount: number;
  recommendedCount: number;
  fullText: string; // 전체 특약 복사용 텍스트
}

// ─── 기본 특약 ───

const BASE_CLAUSES: ContractClause[] = [
  {
    id: "base_registry_maintain",
    category: "기본",
    title: "등기 상태 유지 의무",
    text: "매도인은 본 계약 체결일로부터 잔금 지급일까지 등기부등본상의 권리 상태를 현재와 동일하게 유지하여야 하며, 새로운 근저당권·가압류·가처분 등 제한물권의 설정 및 소유권 변동을 발생시키지 아니한다.",
    triggeredBy: "default",
    priority: "required",
  },
  {
    id: "base_violation_penalty",
    category: "기본",
    title: "위반 시 배액 배상",
    text: "매도인이 전항의 의무를 위반한 경우, 매수인은 본 계약을 해제할 수 있으며, 매도인은 수령한 계약금의 배액을 매수인에게 배상하여야 한다.",
    triggeredBy: "default",
    priority: "required",
  },
  {
    id: "base_registry_confirm",
    category: "기본",
    title: "잔금일 등기부 재확인",
    text: "잔금 지급 당일, 매수인은 등기부등본을 재발급하여 계약 체결 시점 대비 변동사항이 없음을 확인한 후 잔금을 지급한다. 변동사항이 있는 경우, 매수인은 잔금 지급을 거절하고 시정을 요구할 수 있다.",
    triggeredBy: "default",
    priority: "required",
  },
];

// ─── 위험요소별 추가 특약 생성 ───

function generateMortgageClauses(riskScore: RiskScore, parsed: ParsedRegistry): ContractClause[] {
  const clauses: ContractClause[] = [];
  const hasMortgage = parsed.eulgu.some(
    (e) => /근저당|저당/.test(e.purpose) && !e.isCancelled
  );

  if (!hasMortgage) return clauses;

  const activeMortgages = parsed.eulgu.filter(
    (e) => /근저당|저당/.test(e.purpose) && !e.isCancelled
  );
  const holders = [...new Set(activeMortgages.map((m) => m.holder).filter(Boolean))];
  const holderText = holders.length > 0 ? holders.join(", ") : "해당 금융기관";

  clauses.push({
    id: "mortgage_cancel",
    category: "근저당",
    title: "근저당권 말소 특약",
    text: `매도인은 잔금 수령과 동시에 본 부동산에 설정된 모든 근저당권(${holderText})을 말소하여야 하며, 말소에 필요한 서류(해지증서, 말소위임장 등)를 잔금일에 매수인 또는 법무사에게 교부한다. 잔금일 당일 말소서류 미교부 시, 매수인은 잔금 지급을 거절할 수 있다.`,
    triggeredBy: "mortgage",
    priority: "required",
  });

  // 채권최고액이 높은 경우 추가
  if (riskScore.mortgageRatio > 50) {
    clauses.push({
      id: "mortgage_balance_confirm",
      category: "근저당",
      title: "대출잔액 확인 특약",
      text: `매도인은 계약 체결일로부터 7일 이내에 근저당 설정 금융기관(${holderText})으로부터 현재 대출잔액확인서를 발급받아 매수인에게 제출한다. 대출잔액이 채권최고액과 현저히 다를 경우, 매수인은 추가 확인을 요청할 수 있다.`,
      triggeredBy: "mortgage_ratio",
      priority: "recommended",
    });
  }

  return clauses;
}

function generateTrustClauses(parsed: ParsedRegistry): ContractClause[] {
  if (!parsed.summary.hasTrust) return [];

  return [
    {
      id: "trust_consent",
      category: "신탁",
      title: "신탁회사 동의 특약",
      text: "본 부동산은 신탁등기가 설정되어 있으므로, 본 매매계약은 수탁자(신탁회사)의 서면 동의를 조건으로 효력이 발생한다. 매도인(위탁자)은 계약 체결일로부터 14일 이내에 수탁자의 매매 동의서를 취득하여 매수인에게 교부한다. 동의서 미취득 시 본 계약은 자동 해제되며, 매도인은 수령한 계약금 전액을 즉시 반환한다.",
      triggeredBy: "trust",
      priority: "required",
    },
    {
      id: "trust_deregistration",
      category: "신탁",
      title: "신탁등기 해지 특약",
      text: "매도인은 잔금일 이전에 신탁등기를 해지하고, 해지에 따른 소유권이전등기에 필요한 모든 서류를 준비한다. 신탁해지 미완료 시, 매수인은 잔금 지급을 거절할 수 있다.",
      triggeredBy: "trust",
      priority: "required",
    },
  ];
}

function generateProvisionalRegClauses(parsed: ParsedRegistry): ContractClause[] {
  if (!parsed.summary.hasProvisionalRegistration) return [];

  return [
    {
      id: "provisional_reg_cancel",
      category: "가등기",
      title: "가등기 말소 완료 특약",
      text: "매도인은 잔금일 이전에 본 부동산에 설정된 모든 가등기를 말소하고, 말소 완료를 증명하는 등기부등본을 매수인에게 제출한다. 가등기 미말소 시, 매수인은 잔금 지급을 거절하고 계약금의 배액 배상을 청구할 수 있다.",
      triggeredBy: "provisional_reg",
      priority: "required",
    },
  ];
}

function generateSeizureClauses(parsed: ParsedRegistry): ContractClause[] {
  const { hasSeizure, hasProvisionalSeizure, hasProvisionalDisposition } = parsed.summary;

  if (!hasSeizure && !hasProvisionalSeizure && !hasProvisionalDisposition) return [];

  const types: string[] = [];
  if (hasSeizure) types.push("압류");
  if (hasProvisionalSeizure) types.push("가압류");
  if (hasProvisionalDisposition) types.push("가처분");

  return [
    {
      id: "seizure_resolution",
      category: "압류",
      title: `${types.join("/")} 해소 특약`,
      text: `매도인은 잔금일 이전에 본 부동산에 설정된 모든 ${types.join("·")}를 해소(취하·말소)하고, 해소 완료를 증명하는 등기부등본을 매수인에게 제출한다. ${types.join("·")} 미해소 시, 매수인은 계약을 해제하고 계약금의 배액 배상을 청구할 수 있다.`,
      triggeredBy: "seizure",
      priority: "required",
    },
  ];
}

function generateLeaseRegClauses(parsed: ParsedRegistry): ContractClause[] {
  if (!parsed.summary.hasLeaseRegistration) return [];

  return [
    {
      id: "lease_reg_clear",
      category: "임차권",
      title: "임차권등기 해소 특약",
      text: "매도인은 잔금일 이전에 본 부동산에 설정된 임차권등기를 해소하고, 기존 임차인의 보증금을 완전히 반환하였음을 증명하는 서류(반환 영수증 등)를 매수인에게 제출한다. 미해소 시, 매수인은 잔금 지급을 거절할 수 있다.",
      triggeredBy: "lease_registration",
      priority: "required",
    },
  ];
}

function generatePurposeClauses(riskScore: RiskScore): ContractClause[] {
  const hasPurposeIssue = riskScore.factors.some(
    (f) => f.id === "non_residential_purpose"
  );

  if (!hasPurposeIssue) return [];

  return [
    {
      id: "purpose_confirm",
      category: "용도",
      title: "용도 확인 및 보장 특약",
      text: "매도인은 본 부동산의 실제 사용 용도가 등기부등본 및 건축물대장에 기재된 용도와 일치함을 보장한다. 불법 용도변경이 확인될 경우, 매수인은 계약을 해제하고 손해배상을 청구할 수 있다.",
      triggeredBy: "non_residential_purpose",
      priority: "required",
    },
  ];
}

// ─── 전체 텍스트 생성 ───

function buildFullText(clauses: ContractClause[]): string {
  return clauses
    .map((c, i) => `[특약 제${i + 1}조] ${c.title}\n${c.text}`)
    .join("\n\n");
}

// ─── 메인 함수 ───

export function generateContractClauses(
  riskScore: RiskScore,
  parsed: ParsedRegistry,
): ContractClauseResult {
  const clauses: ContractClause[] = [
    ...BASE_CLAUSES,
    ...generateMortgageClauses(riskScore, parsed),
    ...generateTrustClauses(parsed),
    ...generateProvisionalRegClauses(parsed),
    ...generateSeizureClauses(parsed),
    ...generateLeaseRegClauses(parsed),
    ...generatePurposeClauses(riskScore),
  ];

  const requiredCount = clauses.filter((c) => c.priority === "required").length;
  const recommendedCount = clauses.filter((c) => c.priority === "recommended").length;

  return {
    clauses,
    requiredCount,
    recommendedCount,
    fullText: buildFullText(clauses),
  };
}
