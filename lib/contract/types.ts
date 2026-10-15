/**
 * VESTRA 계약서 분석 — 공용 타입
 * ──────────────────────────────────────────────────────────────
 * contract-analyzer 및 하위 모듈이 공유하는 타입 정의.
 */

import type { ClauseInteractionResult } from "../patent-types";

export interface AnalyzedClause {
  title: string;
  content: string;
  riskLevel: "high" | "warning" | "safe";
  analysis: string;
  relatedLaw: string;
}

export interface MissingClause {
  title: string;
  importance: "high" | "medium";
  description: string;
}

export interface ContractPaymentItem {
  label: "계약금" | "중도금" | "잔금" | "기타";
  amount?: number;
  dueDate?: string;
  rawText: string;
}

/** "부동산의 표시" 표의 항목 (계약서마다 항목이 달라 유연한 label-value 구조) */
export interface ContractPropertyDetail {
  label: string;
  value: string;
}

export interface ContractExtractedInfo {
  propertyAddress?: string;
  propertyDetails?: ContractPropertyDetail[];
  landlordName?: string;
  tenantName?: string;
  depositAmount?: number;
  monthlyRentAmount?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  durationMonths?: number;
  paymentSchedule: ContractPaymentItem[];
}

export interface ContractReviewIssue {
  id: string;
  severity: "critical" | "high" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}

export interface ContractAnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  extractedInfo: ContractExtractedInfo;
  reviewIssues: ContractReviewIssue[];
  clauseInteractions?: ClauseInteractionResult;
}

export interface ParsedSection {
  title: string;
  content: string;
  rawText: string;
}
