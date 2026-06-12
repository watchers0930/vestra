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

export interface ContractExtractedInfo {
  propertyAddress?: string;
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

export interface AnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  extractedInfo?: ContractExtractedInfo;
  reviewIssues?: ContractReviewIssue[];
  aiOpinion: string;
  recommendedTerms?: RecommendedTermsResult;
}

// ─── 맞춤 특약 추천 ───

export interface SpecialTermTemplateInfo {
  id: string;
  title: string;
  category: "보증금" | "임차인" | "임대인" | "등기" | "기타";
  priority: "critical" | "high" | "medium";
  template: string;
  rationale: string;
}

export interface RecommendedTerm {
  template: SpecialTermTemplateInfo;
  matchedTriggers: string[];
  rationale: string;
}

export interface RecommendedTermsResult {
  riskLevel: "critical" | "warning" | "safe";
  terms: RecommendedTerm[];
}

export interface SampleContract {
  id: string;
  label: string;
  description: string;
  text: string;
}

export type InputMode = "text" | "file";
