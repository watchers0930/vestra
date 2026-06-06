/**
 * SCR 파싱 유틸리티 — 숫자/텍스트/표 파싱
 *
 * @module lib/feasibility/scr-parser-utils
 */

import type { ExtractedValue } from "./feasibility-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import { SCR_CLAIM_UNITS } from "./scr-claim-keys";

// ─── 패턴 정의 (scr-claim-patterns.ts에서 re-export) ───
export { SCR_PATTERNS, type ScrClaimPattern } from "./scr-claim-patterns";

// ─── 숫자 추출 유틸리티 ───

/** 쉼표·공백 제거 후 숫자 파싱 */
export function parseNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** 한국어 금액 단위를 만원 기준으로 변환 */
export function normalizeToManwon(value: number, unit: string): number {
  if (unit.includes("조")) return value * 1_0000_0000;
  if (unit.includes("억")) return value * 10000;
  if (unit.includes("백만")) return value * 100;
  if (unit.includes("천만")) return value * 1000;
  if (unit === "원") return value / 10000;
  return value;
}

/** 복합 금액 패턴 파싱: "1조 2,345억원", "123,456백만원" 등 */
export function parseComplexAmount(text: string): { value: number; unit: string } | null {
  const joMatch = text.match(/([0-9,.]+)\s*조\s*([0-9,.]+)?\s*억?\s*원?/);
  if (joMatch) {
    const jo = parseNumber(joMatch[1]);
    const eok = joMatch[2] ? parseNumber(joMatch[2]) : 0;
    return { value: jo * 1_0000_0000 + eok * 10000, unit: "만원" };
  }

  const eokCheonMatch = text.match(/([0-9,.]+)\s*억\s*([0-9,.]+)?\s*천만?\s*원?/);
  if (eokCheonMatch) {
    const eok = parseNumber(eokCheonMatch[1]);
    const cheon = eokCheonMatch[2] ? parseNumber(eokCheonMatch[2]) : 0;
    return { value: eok * 10000 + cheon * 1000, unit: "만원" };
  }

  const generalMatch = text.match(/([0-9,.]+)\s*(조원|억원|백만원|천만원|만원|원)/);
  if (generalMatch) {
    const val = parseNumber(generalMatch[1]);
    return { value: normalizeToManwon(val, generalMatch[2]), unit: "만원" };
  }

  return null;
}

/** 면적 변환: 평 → ㎡ */
export function pyeongToSqm(pyeong: number): number {
  return Number((pyeong * 3.305785).toFixed(2));
}

// ─── 텍스트 정규화 ───

/** SCR 텍스트 전처리 (공백/특수문자 정규화) */
export function normalizeScrText(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, " ")
    .replace(/[：﹕]/g, ":")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, "\t")
    .replace(/사\s*업\s*명/g, "사업명")
    .replace(/소\s*재\s*지/g, "소재지")
    .replace(/시\s*공\s*사/g, "시공사")
    .replace(/시\s*행\s*사/g, "시행사")
    .replace(/신\s*탁\s*사/g, "신탁사")
    .replace(/건\s*폐\s*율/g, "건폐율")
    .replace(/용\s*적\s*률/g, "용적률")
    .replace(/대\s*지\s*면\s*적/g, "대지면적")
    .replace(/연\s*면\s*적/g, "연면적")
    .replace(/건\s*축\s*면\s*적/g, "건축면적")
    .replace(/세\s*대\s*수/g, "세대수")
    .replace(/공\s*사\s*기\s*간/g, "공사기간")
    .replace(/분\s*양\s*가/g, "분양가")
    .replace(/토\s*지\s*비/g, "토지비")
    .replace(/공\s*사\s*비/g, "공사비")
    .replace(/수\s*익\s*률/g, "수익률")
    .trim();
}

// ─── 표 구조 파싱 ───

/** 탭/공백 구분 테이블 행 파싱 */
export function parseTableRow(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim()).filter(Boolean);
  }
  return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

/** 텍스트에서 "라벨: 값" 패턴 추출 */
export function extractLabelValue(
  text: string,
  labelPattern: RegExp
): string | null {
  const match = text.match(labelPattern);
  if (match && match[1]) return match[1].trim();
  return null;
}

// ─── 사업수지 표 전용 파서 ───

/** 사업수지 표에서 수입/지출 항목을 일괄 추출 */
export function parseBusinessIncomeTable(
  text: string,
  sourceFile: string
): Partial<Record<ScrClaimKey, ExtractedValue>> {
  const result: Partial<Record<ScrClaimKey, ExtractedValue>> = {};

  const revenueMapping: [RegExp, ScrClaimKey][] = [
    [/아파트\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_apartment"],
    [/오피스텔\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_officetel"],
    [/발코니\s*(?:확장)?(?:비|수입)\s+([0-9,.]+)/, "revenue_balcony"],
    [/상가\s*(?:분양)?(?:수입|대금)\s+([0-9,.]+)/, "revenue_commercial"],
    [/중도금\s*이자\s*(?:수입)?\s+([0-9,.]+)/, "revenue_interim_interest"],
    [/부가(?:가치)?세\s+([0-9,.]+)/, "revenue_vat"],
  ];

  const costMapping: [RegExp, ScrClaimKey][] = [
    [/토지비\s+([0-9,.]+)/, "cost_land"],
    [/직접\s*공사비\s+([0-9,.]+)/, "cost_direct_construction"],
    [/간접\s*공사비\s+([0-9,.]+)/, "cost_indirect_construction"],
    [/분양경비\s+([0-9,.]+)/, "cost_sales"],
    [/일반\s*관리비\s+([0-9,.]+)/, "cost_general_admin"],
    [/제세공과(?:금)?\s+([0-9,.]+)/, "cost_tax"],
    [/PF\s*수수료\s+([0-9,.]+)/, "cost_pf_fee"],
    [/PF\s*이자\s+([0-9,.]+)/, "cost_pf_interest"],
    [/중도금\s*이자\s*(?:비용)?\s+([0-9,.]+)/, "cost_interim_interest"],
  ];

  const profitMapping: [RegExp, ScrClaimKey][] = [
    [/세전\s*(?:사업)?이익\s+([0-9,.]+)/, "profit_before_tax"],
    [/(?:사업)?수익률\s+([0-9,.]+)\s*%/, "profit_rate"],
  ];

  const allMappings = [...revenueMapping, ...costMapping, ...profitMapping];

  for (const [pattern, key] of allMappings) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rawValue = parseNumber(match[1]);
      if (rawValue > 0) {
        const unit = SCR_CLAIM_UNITS[key];
        const contextStart = Math.max(0, text.indexOf(match[0]) - 20);
        const contextEnd = Math.min(text.length, text.indexOf(match[0]) + match[0].length + 20);
        const context = text.slice(contextStart, contextEnd).trim();

        result[key] = {
          key,
          value: unit === "%" ? rawValue : rawValue,
          unit,
          sourceFile,
          context,
        };
      }
    }
  }

  return result;
}

// ─── 타입별 분양가 상세 파서 ───

/** 타입별 분양가 표 파싱 */
export function parseSaleTypeDetail(
  text: string,
  sourceFile: string
): ExtractedValue | null {
  const typeRows: {
    type: string; units: number; exclusiveArea: number;
    supplyArea: number; pricePerPyeong: number;
  }[] = [];

  const typePattern = /(\d{2,3}[A-Z]?)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = typePattern.exec(text)) !== null) {
    const type = match[1];
    const units = parseNumber(match[2]);
    const exclusiveArea = parseNumber(match[3]);
    const supplyArea = parseNumber(match[4]);
    const pricePerPyeong = parseNumber(match[5]);

    if (units > 0 && exclusiveArea > 0) {
      typeRows.push({ type, units, exclusiveArea, supplyArea, pricePerPyeong });
    }
  }

  if (typeRows.length === 0) return null;

  return {
    key: "sale_type_detail",
    value: typeRows.length,
    unit: "JSON",
    sourceFile,
    context: JSON.stringify(typeRows),
  };
}

// ─── 기간별 분양률 파서 ───

/** 기간별 분양률 표 파싱 */
export function parsePeriodSaleRate(
  text: string,
  sourceFile: string
): ExtractedValue | null {
  const rows: { period: string; shortTerm: number; cumulative: number }[] = [];

  const periodPattern = /((?:분양|착공|입주)?[~\-]?\s*\d+\s*(?:개월|월)(?:\s*[~\-]\s*\d+\s*(?:개월|월))?)\s+([0-9,.]+)\s*%?\s+([0-9,.]+)\s*%?/g;
  let match: RegExpExecArray | null;

  while ((match = periodPattern.exec(text)) !== null) {
    const period = match[1].trim();
    const shortTerm = parseNumber(match[2]);
    const cumulative = parseNumber(match[3]);

    if (shortTerm >= 0 && cumulative >= 0) {
      rows.push({ period, shortTerm, cumulative });
    }
  }

  if (rows.length === 0) return null;

  return {
    key: "period_sale_rate",
    value: rows.length,
    unit: "JSON",
    sourceFile,
    context: JSON.stringify(rows),
  };
}
