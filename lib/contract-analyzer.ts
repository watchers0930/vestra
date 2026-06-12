/**
 * VESTRA 계약서 조항 분석 엔진 (Contract Clause Analysis Engine)
 * ──────────────────────────────────────────────────────────────
 * 한국 부동산 계약서를 규칙 기반으로 파싱하여 조항별 리스크 판정.
 * LLM 없이 법령 DB + 패턴 매칭으로 위험 요소 감지.
 */

import type { ClauseInteractionResult } from "./patent-types";
import { CLAUSE_RULES, REQUIRED_CLAUSES, analyzeClauseInteractions } from "./contract/clause-rules";

// ─── re-export (기존 import 경로 유지) ───

export { CLAUSE_RULES, REQUIRED_CLAUSES, CLAUSE_INTERACTION_RULES, analyzeClauseInteractions } from "./contract/clause-rules";
export type { ClauseRule, RequiredClauseCheck } from "./contract/clause-rules";

// ─── 타입 정의 ───

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

export interface ContractAnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  extractedInfo: ContractExtractedInfo;
  reviewIssues: ContractReviewIssue[];
  clauseInteractions?: ClauseInteractionResult;
}

interface ParsedSection {
  title: string;
  content: string;
  rawText: string;
}

// ─── 조항 파싱 ───

/** 계약서 텍스트를 조항 단위로 분리 */
function parseContractSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // 제N조 패턴으로 분리
  const clausePattern = /제\s*(\d+)\s*조\s*[\(（]([^)）]+)[\)）]/g;
  const matches: { index: number; title: string; num: number }[] = [];

  let match;
  while ((match = clausePattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      title: match[2].trim(),
      num: parseInt(match[1]),
    });
  }

  // 각 조항의 내용 추출
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawText = text.slice(start, end).trim();
    const content = rawText.replace(/^제\s*\d+\s*조\s*[\(（][^)）]+[\)）]\s*/, "").trim();
    sections.push({
      title: `제${matches[i].num}조 (${matches[i].title})`,
      content,
      rawText,
    });
  }

  // 제N조 패턴이 없는 경우 섹션 헤더로 분리 시도
  if (sections.length === 0) {
    const headerPattern = /\[([^\]]+)\]|【([^】]+)】/g;
    const headers: { index: number; title: string }[] = [];

    while ((match = headerPattern.exec(text)) !== null) {
      headers.push({ index: match.index, title: (match[1] || match[2]).trim() });
    }

    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      const rawText = text.slice(start, end).trim();
      const content = rawText.replace(/^\[[^\]]+\]\s*|^【[^】]+】\s*/, "").trim();
      if (content.length > 10) {
        sections.push({ title: headers[i].title, content, rawText });
      }
    }
  }

  return sections;
}

// ─── 분석 로직 ───

/** 파싱된 조항에 리스크 규칙 적용 */
function analyzeClauseRisk(section: ParsedSection): AnalyzedClause | null {
  const fullText = section.rawText;

  for (const rule of CLAUSE_RULES) {
    const matches = rule.detectPatterns.some((p) => p.test(fullText));
    if (matches) {
      const { riskLevel, analysis } = rule.analyzeRisk(fullText);
      return {
        title: section.title,
        content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
        riskLevel,
        analysis,
        relatedLaw: rule.relatedLaw,
      };
    }
  }

  // 매칭되지 않는 조항은 기본 safe
  return {
    title: section.title,
    content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
    riskLevel: "safe",
    analysis: "표준적인 계약 조항입니다",
    relatedLaw: "민법 제618조~제654조 (임대차)",
  };
}

/** 누락 조항 검사 */
function checkMissingClauses(fullText: string): MissingClause[] {
  const missing: MissingClause[] = [];

  for (const check of REQUIRED_CLAUSES) {
    const found = check.detectPatterns.some((p) => p.test(fullText));
    if (!found) {
      missing.push({
        title: check.title,
        importance: check.importance,
        description: check.description,
      });
    }
  }

  return missing;
}

function normalizeDate(raw: string): string | undefined {
  const compact = raw
    .replace(/\s+/g, "")
    .replace(/[./]/g, "-")
    .replace(/년|월/g, "-")
    .replace(/일/g, "");
  const match = compact.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function monthDiff(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return undefined;
  const inclusiveEnd = new Date(e);
  inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
  const months = (inclusiveEnd.getFullYear() - s.getFullYear()) * 12 + (inclusiveEnd.getMonth() - s.getMonth());
  return months + (inclusiveEnd.getDate() >= s.getDate() ? 0 : -1);
}

function parseKoreanMoney(raw: string): number | undefined {
  const text = raw.replace(/[,\s]/g, "");
  if (!text) return undefined;
  const numericWon = text.match(/(\d+(?:\.\d+)?)원/);
  if (numericWon && !/[억만천]/.test(text)) {
    return Math.round(Number(numericWon[1]));
  }

  let total = 0;
  const eok = text.match(/(\d+(?:\.\d+)?)억/);
  const man = text.match(/(\d+(?:\.\d+)?)만/);
  const cheon = text.match(/(\d+(?:\.\d+)?)천(?=만|만원|원)?/);
  if (eok) total += Number(eok[1]) * 100_000_000;
  if (cheon && /천만/.test(text)) total += Number(cheon[1]) * 10_000_000;
  if (man && !/천만/.test(text)) total += Number(man[1]) * 10_000;
  return total > 0 ? Math.round(total) : undefined;
}

const MONEY_TEXT_PATTERN = String.raw`([0-9,.]+\s*억(?:\s*[0-9,.]+\s*천\s*만)?(?:\s*[0-9,.]+\s*만)?\s*원?|[0-9,.]+\s*천만\s*원?|[0-9,.]+\s*만\s*원?|[0-9,.]+\s*원)`;

function extractFirstMoneyAfter(labelPattern: RegExp, text: string): number | undefined {
  const match = text.match(labelPattern);
  if (!match) return undefined;
  return parseKoreanMoney(match[1] || match[0]);
}

function extractLabeledLineValue(text: string, labels: string[]): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const label = labels.find((item) => line.includes(item));
    if (!label) continue;

    const afterLabel = line
      .slice(line.indexOf(label) + label.length)
      .replace(/^[\s:：)\]】.-]+/, "")
      .trim();
    if (afterLabel.length >= 4 && !/^제\s*\d+\s*조/.test(afterLabel)) {
      return afterLabel;
    }

    const nextLine = lines[index + 1];
    if (nextLine && !/^제\s*\d+\s*조/.test(nextLine)) {
      return nextLine.replace(/^[\s:：)\]】.-]+/, "").trim();
    }
  }

  return undefined;
}

function extractContractInfo(text: string): ContractExtractedInfo {
  const address =
    extractLabeledLineValue(text, ["소재지", "주소", "목적물의 표시", "목적물"]) ||
    text.match(/([가-힣]+(?:특별시|광역시|특별자치시|도)\s+[^\n,]+(?:동|리|로|길)[^\n]*)/)?.[1]?.trim();

  const landlordName =
    text.match(/임대인[\s:：]*([가-힣A-Za-z]{2,20})/)?.[1]?.trim() ||
    text.match(/매도인[\s:：]*([가-힣A-Za-z]{2,20})/)?.[1]?.trim();
  const tenantName =
    text.match(/임차인[\s:：]*([가-힣A-Za-z]{2,20})/)?.[1]?.trim() ||
    text.match(/매수인[\s:：]*([가-힣A-Za-z]{2,20})/)?.[1]?.trim();

  const depositAmount = extractFirstMoneyAfter(
    new RegExp(String.raw`보증금(?:은|:|：)?\s*(?:금)?\s*${MONEY_TEXT_PATTERN}`),
    text,
  );
  const monthlyRentAmount = extractFirstMoneyAfter(
    new RegExp(String.raw`(?:월세|차임|월\s*차임)(?:은|:|：)?\s*(?:금)?\s*${MONEY_TEXT_PATTERN}`),
    text,
  );

  const periodMatch = text.match(
    /(\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?)\s*(?:부터|~|-|부터\s*)\s*(\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?)(?:까지)?/,
  );
  const contractStartDate = periodMatch ? normalizeDate(periodMatch[1]) : undefined;
  const contractEndDate = periodMatch ? normalizeDate(periodMatch[2]) : undefined;
  const explicitYearDuration = text.match(/(?:계약기간|임대차\s*기간)[\s\S]{0,40}(\d+)\s*년/)?.[1];
  const explicitMonthDuration = text.match(/(?:계약기간|임대차\s*기간)[\s\S]{0,40}(\d+)\s*개월/)?.[1];
  const durationMonths =
    monthDiff(contractStartDate, contractEndDate) ||
    (explicitYearDuration ? Number(explicitYearDuration) * 12 : undefined) ||
    (explicitMonthDuration ? Number(explicitMonthDuration) : undefined);

  const paymentSchedule: ContractPaymentItem[] = [];
  const paymentPattern = new RegExp(
    String.raw`(계약금|중도금|잔금)[^\n,。]*?(?:금)?\s*${MONEY_TEXT_PATTERN}[^\n,。]*`,
    "g",
  );
  let paymentMatch;
  while ((paymentMatch = paymentPattern.exec(text)) !== null) {
    const date = paymentMatch[0].match(/\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?/);
    paymentSchedule.push({
      label: paymentMatch[1] as ContractPaymentItem["label"],
      amount: parseKoreanMoney(paymentMatch[2]),
      dueDate: date ? normalizeDate(date[0]) : undefined,
      rawText: paymentMatch[0],
    });
  }

  return {
    propertyAddress: address,
    landlordName,
    tenantName,
    depositAmount,
    monthlyRentAmount,
    contractStartDate,
    contractEndDate,
    durationMonths,
    paymentSchedule,
  };
}

function hasMissing(missingClauses: MissingClause[], keyword: string): boolean {
  return missingClauses.some((item) => item.title.includes(keyword));
}

function buildReviewIssues(
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

/** 안전점수 계산 (조항 상호작용 감점 포함) */
function calculateSafetyScore(
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

// ─── 메인 분석 함수 ───

export function analyzeContract(contractText: string): ContractAnalysisResult {
  // 조항 파싱
  const sections = parseContractSections(contractText);

  // 조항별 리스크 분석
  const clauses: AnalyzedClause[] = [];
  for (const section of sections) {
    const analyzed = analyzeClauseRisk(section);
    if (analyzed) {
      clauses.push(analyzed);
    }
  }

  // 전체 텍스트에서 규칙 매칭 (파싱 실패한 내용도 포함)
  if (clauses.length === 0) {
    // 조항이 하나도 파싱되지 않은 경우, 전체 텍스트를 하나의 조항으로 분석
    for (const rule of CLAUSE_RULES) {
      const matches = rule.detectPatterns.some((p) => p.test(contractText));
      if (matches) {
        const { riskLevel, analysis } = rule.analyzeRisk(contractText);
        clauses.push({
          title: rule.title,
          content: contractText.slice(0, 200) + (contractText.length > 200 ? "..." : ""),
          riskLevel,
          analysis,
          relatedLaw: rule.relatedLaw,
        });
      }
    }
  }

  // 누락 조항 검사
  const missingClauses = checkMissingClauses(contractText);
  const extractedInfo = extractContractInfo(contractText);
  const reviewIssues = buildReviewIssues(contractText, extractedInfo, missingClauses);

  // 조항 상호작용 분석 (특허: 교차 위험 탐지)
  const clauseInteractions = analyzeClauseInteractions(clauses, missingClauses, contractText);

  // 안전점수 계산 (상호작용 감점 포함)
  const safetyScore = calculateSafetyScore(clauses, missingClauses, reviewIssues, clauseInteractions.totalInteractionImpact);

  return { clauses, missingClauses, safetyScore, extractedInfo, reviewIssues, clauseInteractions };
}
