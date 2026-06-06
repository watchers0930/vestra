/**
 * SCR 보고서 확장 파싱 엔진
 *
 * 기존 document-parser.ts의 18개 키를 47개로 확장하여
 * SCR PDF 텍스트에서 사업개요, 분양가, 자금조달, 사업수지, 토지 등
 * 전체 항목을 정규식 패턴 매칭으로 추출합니다.
 *
 * @module lib/feasibility/scr-parser-extensions
 */

import type { ExtractedValue } from "./feasibility-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import { SCR_CLAIM_KEYS, SCR_CLAIM_CATEGORIES } from "./scr-claim-keys";
import {
  parseNumber,
  normalizeToManwon,
  parseComplexAmount,
  pyeongToSqm,
  normalizeScrText,
  parseTableRow,
  extractLabelValue,
  SCR_PATTERNS,
  parseBusinessIncomeTable,
  parseSaleTypeDetail,
  parsePeriodSaleRate,
  type ScrClaimPattern,
} from "./scr-parser-utils";

// ─── 파싱 결과 타입 ───

/** SCR 파싱 전체 결과 */
export interface ScrParsedData {
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>;
  sections: ScrSectionGroup;
  confidence: number;
  stats: {
    totalKeys: number;
    extractedKeys: number;
    extractionRate: number;
  };
}

/** 섹션별 그룹핑 */
export interface ScrSectionGroup {
  사업개요: Partial<Record<ScrClaimKey, ExtractedValue>>;
  분양가: Partial<Record<ScrClaimKey, ExtractedValue>>;
  자금조달: Partial<Record<ScrClaimKey, ExtractedValue>>;
  공사비: Partial<Record<ScrClaimKey, ExtractedValue>>;
  사업수지_수입: Partial<Record<ScrClaimKey, ExtractedValue>>;
  사업수지_지출: Partial<Record<ScrClaimKey, ExtractedValue>>;
  수익성: Partial<Record<ScrClaimKey, ExtractedValue>>;
  토지: Partial<Record<ScrClaimKey, ExtractedValue>>;
  운영수익: Partial<Record<ScrClaimKey, ExtractedValue>>;
}

// ─── 메인 파싱 함수 ───

/**
 * SCR PDF 텍스트에서 47개 항목을 추출하는 메인 함수
 */
export function parseScrDocument(
  text: string,
  sourceFile = "scr-report.pdf"
): ScrParsedData {
  const normalizedText = normalizeScrText(text);
  const claims: Partial<Record<ScrClaimKey, ExtractedValue>> = {};

  // 1단계: 정규식 패턴 매칭으로 각 키 추출
  for (const [key, patternDef] of Object.entries(SCR_PATTERNS) as [ScrClaimKey, ScrClaimPattern][]) {
    if (!patternDef) continue;
    if (Object.hasOwn(claims, key)) continue;

    const { patterns, unit, isText, postProcess } = patternDef;

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        if (isText) {
          const textValue = match[1].trim();
          if (textValue.length > 0) {
            claims[key] = {
              key, value: 0, unit, sourceFile, context: textValue,
            };
            break;
          }
        } else {
          let value = parseNumber(match[1]);
          if (value > 0) {
            if (postProcess) {
              value = postProcess(value, match[2]);
            }
            const matchIndex = normalizedText.indexOf(match[0]);
            const contextStart = Math.max(0, matchIndex - 30);
            const contextEnd = Math.min(
              normalizedText.length,
              matchIndex + match[0].length + 30
            );
            const context = normalizedText.slice(contextStart, contextEnd).trim();

            claims[key] = {
              key,
              value: unit === "㎡" ? Number(value.toFixed(2)) : value,
              unit, sourceFile, context,
            };
            break;
          }
        }
      }
    }
  }

  // 2단계: 사업수지 표 전용 파서로 추가 추출
  const businessIncomeClaims = parseBusinessIncomeTable(normalizedText, sourceFile);
  for (const [key, value] of Object.entries(businessIncomeClaims) as [ScrClaimKey, ExtractedValue][]) {
    if (!claims[key]) {
      claims[key] = value;
    }
  }

  // 3단계: 특수 JSON 항목 추출
  const saleTypeDetail = parseSaleTypeDetail(normalizedText, sourceFile);
  if (saleTypeDetail && !claims.sale_type_detail) {
    claims.sale_type_detail = saleTypeDetail;
  }

  const periodSaleRate = parsePeriodSaleRate(normalizedText, sourceFile);
  if (periodSaleRate && !claims.period_sale_rate) {
    claims.period_sale_rate = periodSaleRate;
  }

  // 4단계: 섹션별 그룹핑
  const sections = groupBySection(claims);

  // 5단계: 신뢰도 계산
  const extractedKeys = Object.keys(claims).length;
  const totalKeys = SCR_CLAIM_KEYS.length;
  const confidence = calculateScrConfidence(claims, normalizedText, extractedKeys, totalKeys);

  return {
    claims,
    sections,
    confidence,
    stats: {
      totalKeys,
      extractedKeys,
      extractionRate: Number(((extractedKeys / totalKeys) * 100).toFixed(1)),
    },
  };
}

// ─── 섹션 그룹핑 ───

function groupBySection(
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>
): ScrSectionGroup {
  const sections: ScrSectionGroup = {
    사업개요: {}, 분양가: {}, 자금조달: {}, 공사비: {},
    사업수지_수입: {}, 사업수지_지출: {}, 수익성: {}, 토지: {}, 운영수익: {},
  };

  for (const [category, keys] of Object.entries(SCR_CLAIM_CATEGORIES) as [keyof ScrSectionGroup, readonly ScrClaimKey[]][]) {
    for (const key of keys) {
      if (claims[key]) {
        sections[category][key] = claims[key];
      }
    }
  }

  return sections;
}

// ─── 신뢰도 계산 ───

function calculateScrConfidence(
  claims: Partial<Record<ScrClaimKey, ExtractedValue>>,
  text: string,
  extractedKeys: number,
  totalKeys: number
): number {
  let score = (extractedKeys / totalKeys) * 50;

  const criticalKeys: ScrClaimKey[] = [
    "building_name", "total_land_area", "total_floor_area",
    "total_units", "pf_total", "profit_before_tax", "profit_rate",
  ];
  const criticalFound = criticalKeys.filter((k) => claims[k]).length;
  score += (criticalFound / criticalKeys.length) * 25;

  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const koreanRatio = koreanChars / Math.max(1, text.length);
  if (koreanRatio > 0.15) score += 8;
  if (koreanRatio > 0.25) score += 7;

  if (text.length > 5000) score += 5;
  if (text.length > 20000) score += 5;

  return Math.min(100, Math.round(score));
}

// ─── 유틸리티 내보내기 ───

export const scrParserUtils = {
  parseNumber,
  normalizeToManwon,
  parseComplexAmount,
  pyeongToSqm,
  normalizeScrText,
  parseTableRow,
  extractLabelValue,
} as const;
