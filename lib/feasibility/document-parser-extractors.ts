/**
 * 문서 파서 — 수치 추출 모듈
 *
 * 정규식 패턴 매칭, NER 기반 폴백, AI 폴백으로
 * 사업계획서에서 핵심 재무 수치를 자동 추출합니다.
 *
 * @module lib/feasibility/document-parser-extractors
 */

import { getOpenAIClient } from "../openai";
import { extractEntities } from "../nlp-ner-pipeline";
import type { Entity } from "../nlp-ner-pipeline";
import type { ExtractedValue, ClaimKey } from "./feasibility-types";
import { CLAIM_KEYS, CLAIM_LABELS } from "./feasibility-types";

// ─── 컨텍스트 제외 키워드 ───

const CONTEXT_EXCLUSION_KEYWORDS = [
  "appendix",
  "인구수",
  "세대수 추이",
  "1,2인세대수",
  "광역철도",
  "국토교통부",
  "규제지역",
  "기준금리 추이",
  "사업주관",
];

// ─── 주장 추출 정규식 패턴 ───

interface ClaimPattern {
  patterns: RegExp[];
  unit: string;
}

export const CLAIM_PATTERNS: Partial<Record<ClaimKey, ClaimPattern>> = {
  planned_sale_price: {
    patterns: [
      /(?:예상|계획|목표)?\s*분양가(?:격)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)/,
      /분양\s*단가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /평당\s*분양가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /예정\s*분양가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
    ],
    unit: "만원/평",
  },
  total_construction_cost: {
    patterns: [
      /총\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /공사비\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /공사비\s*총액(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /건축\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "억원",
  },
  construction_cost_per_pyeong: {
    patterns: [
      /평당\s*공사비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /공사비\s*단가(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
      /공사비\s*\(평당\)(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(만원|원)?/,
    ],
    unit: "만원/평",
  },
  expected_sale_rate: {
    patterns: [
      /(?:예상|목표|초기)?\s*분양률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /분양\s*예상률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  expected_profit_rate: {
    patterns: [
      /(?:예상|목표|사업|투자)?\s*수익률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /IRR(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /ROI(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  pf_interest_rate: {
    patterns: [
      /PF\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /PF\s*조달\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /프로젝트\s*파이낸싱(?:\s*금리)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /브릿지\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /대출\s*금리(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  total_project_cost: {
    patterns: [
      /총\s*사업비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /사업비\s*합계(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /사업\s*총비용(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "억원",
  },
  land_cost: {
    patterns: [
      /토지비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)/,
      /토지\s*매입(?:비)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
      /용지비(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(억원|만원)?/,
    ],
    unit: "억원",
  },
  total_land_area: {
    patterns: [
      /(?:대지|토지|부지)\s*면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/,
    ],
    unit: "㎡",
  },
  total_floor_area: {
    patterns: [
      /(?:총\s*)?연\s*면적(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(㎡|평|m²)?/,
    ],
    unit: "㎡",
  },
  floor_area_ratio: {
    patterns: [
      /용적률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /용적율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  building_coverage: {
    patterns: [
      /건폐율(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
      /건폐률(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*%?/,
    ],
    unit: "%",
  },
  total_units: {
    patterns: [
      /총\s*세대(?:수)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(세대|호실|실|호)?/,
      /총\s*호실(?:수)?(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(호실|실|호)?/,
      /세대\s*수(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(세대)?/,
      /호실\s*수(?:\s*[:=]\s*|\s+)([0-9,.]+)\s*(호실|실|호)?/,
      /([0-9,.]+)\s*세대\s*규모/,
    ],
    unit: "세대",
  },
};

// ─── 수치 추출 유틸 ───

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeExtractionText(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, " ")
    .replace(/[：﹕]/g, ":")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/건\s*폐\s*율/g, "건폐율")
    .replace(/용\s*적\s*률/g, "용적률")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldSkipContext(context: string): boolean {
  const lower = context.toLowerCase();
  return CONTEXT_EXCLUSION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function convertUnitValue(value: number, matchedUnit: string | undefined, targetUnit: string): number {
  if (!matchedUnit) return value;

  if (targetUnit === "만원/평" && matchedUnit === "원") {
    return value / 10000;
  }

  if (targetUnit === "억원" && matchedUnit === "만원") {
    return value / 10000;
  }

  if (targetUnit === "㎡" && matchedUnit === "평") {
    return value * 3.305785;
  }

  return value;
}

function buildExtractedValue(
  key: string,
  value: number,
  unit: string,
  sourceFile: string,
  context: string
): ExtractedValue | null {
  if (value <= 0 || shouldSkipContext(context)) {
    return null;
  }

  return {
    key,
    value: unit === "㎡" ? Number(value.toFixed(2)) : value,
    unit,
    sourceFile,
    context,
  };
}

// ─── 특수 패턴 추출 ───

function extractSpecialClaims(
  normalizedText: string,
  sourceFile: string
): Record<string, ExtractedValue> {
  const extracted: Record<string, ExtractedValue> = {};

  const areaScaleMatch = normalizedText.match(
    /대지면적\s*([0-9,.]+)\s*평[\s\S]*?연면적\s*([0-9,.]+)\s*평[\s\S]*?아파트\s*([0-9,]+)\s*세대,\s*오피스텔\s*([0-9,]+)\s*실/
  );
  if (areaScaleMatch) {
    const landArea = convertUnitValue(parseNumber(areaScaleMatch[1]), "평", "㎡");
    const floorArea = convertUnitValue(parseNumber(areaScaleMatch[2]), "평", "㎡");
    const totalUnits = parseNumber(areaScaleMatch[3]) + parseNumber(areaScaleMatch[4]);
    const context = areaScaleMatch[0];

    const landAreaValue = buildExtractedValue("total_land_area", landArea, "㎡", sourceFile, context);
    const floorAreaValue = buildExtractedValue("total_floor_area", floorArea, "㎡", sourceFile, context);
    const unitsValue = buildExtractedValue("total_units", totalUnits, "세대", sourceFile, context);

    if (landAreaValue) extracted.total_land_area = landAreaValue;
    if (floorAreaValue) extracted.total_floor_area = floorAreaValue;
    if (unitsValue) extracted.total_units = unitsValue;
  }

  const ratioMatch = normalizedText.match(
    /건폐율\s*\/\s*용적률\s*[:\-]?\s*([0-9,.\s]+)\s*%\s*\/\s*([0-9,.\s]+)\s*%/
  );
  const ratioFallbackMatch = normalizedText.match(
    /건폐율\s*\/?\s*용적률\s*[:\-]?\s*([0-9,.\s]+)\s*%\s*\/\s*([0-9,.\s]+)\s*%/
  );
  const ratioSource = ratioMatch || ratioFallbackMatch;
  if (ratioSource) {
    const context = ratioSource[0];
    const buildingCoverageValue = buildExtractedValue(
      "building_coverage", parseNumber(ratioSource[1]), "%", sourceFile, context
    );
    const floorAreaRatioValue = buildExtractedValue(
      "floor_area_ratio", parseNumber(ratioSource[2]), "%", sourceFile, context
    );

    if (buildingCoverageValue) extracted.building_coverage = buildingCoverageValue;
    if (floorAreaRatioValue) extracted.floor_area_ratio = floorAreaRatioValue;
  }

  const pfRateMatch = normalizedText.match(/PF대출\s+자기자본[\s\S]*?([0-9.]+)%\(?예정\)?/);
  if (pfRateMatch) {
    const pfRateValue = buildExtractedValue(
      "pf_interest_rate", parseNumber(pfRateMatch[1]), "%", sourceFile, pfRateMatch[0]
    );
    if (pfRateValue) extracted.pf_interest_rate = pfRateValue;
  }

  const totalProjectCostMatch = normalizedText.match(
    /사업비\s*합계\s*([0-9,]+)\s*[0-9.]+\s*%\s*\(세전\)\s*사업이익/
  );
  if (totalProjectCostMatch) {
    const totalProjectCostValue = buildExtractedValue(
      "total_project_cost",
      parseNumber(totalProjectCostMatch[1]) / 100,
      "억원", sourceFile, totalProjectCostMatch[0]
    );
    if (totalProjectCostValue) extracted.total_project_cost = totalProjectCostValue;
  }

  return extracted;
}

// ─── 정규식 기반 추출 ───

export function extractClaims(
  rawText: string,
  sourceFile: string
): Record<string, ExtractedValue> {
  const extracted: Record<string, ExtractedValue> = {};
  const normalizedText = normalizeExtractionText(rawText);
  Object.assign(extracted, extractSpecialClaims(normalizedText, sourceFile));

  for (const [key, patternDef] of Object.entries(CLAIM_PATTERNS)) {
    if (!patternDef) continue;
    const { patterns, unit } = patternDef;
    if (extracted[key]) continue;
    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const value = parseNumber(match[1]);
        if (value > 0) {
          const finalValue = convertUnitValue(value, match[2], unit);
          const finalUnit = unit;

          const matchIndex = normalizedText.indexOf(match[0]);
          const contextStart = Math.max(0, matchIndex - 30);
          const contextEnd = Math.min(normalizedText.length, matchIndex + match[0].length + 30);
          const context = normalizedText.slice(contextStart, contextEnd).trim();

          const extractedValue = buildExtractedValue(key, finalValue, finalUnit, sourceFile, context);
          if (extractedValue) {
            extracted[key] = extractedValue;
            break;
          }
        }
      }
    }
  }

  return extracted;
}

export function extractClaimsFromTextForTest(
  rawText: string,
  sourceFile = "test.txt"
): Record<string, ExtractedValue> {
  return extractClaims(rawText, sourceFile);
}

// ─── NER 기반 폴백 추출 ───

export function extractClaimsWithNER(
  rawText: string,
  sourceFile: string
): Record<string, ExtractedValue> {
  const entities = extractEntities(rawText);
  const extracted: Record<string, ExtractedValue> = {};

  const moneyEntities = entities.filter(
    (e: Entity) => e.type === "MONEY" && typeof e.normalizedValue === "number" && (e.normalizedValue as number) > 0
  );

  for (const entity of moneyEntities) {
    const value = entity.normalizedValue as number;
    const contextStart = Math.max(0, entity.start - 40);
    const context = rawText.slice(contextStart, entity.end + 20).trim();

    if (!extracted.total_project_cost && (context.includes("사업비") || context.includes("총사업"))) {
      const valueInEok = value >= 100_000_000 ? value / 100_000_000 : value;
      extracted.total_project_cost = { key: "total_project_cost", value: valueInEok, unit: "억원", sourceFile, context };
    } else if (!extracted.land_cost && (context.includes("토지비") || context.includes("용지비") || context.includes("토지매입"))) {
      const valueInEok = value >= 100_000_000 ? value / 100_000_000 : value;
      extracted.land_cost = { key: "land_cost", value: valueInEok, unit: "억원", sourceFile, context };
    } else if (!extracted.total_construction_cost && (context.includes("공사비") || context.includes("건축비"))) {
      const valueInEok = value >= 100_000_000 ? value / 100_000_000 : value;
      extracted.total_construction_cost = { key: "total_construction_cost", value: valueInEok, unit: "억원", sourceFile, context };
    }
  }

  const areaEntities = entities.filter(
    (e: Entity) => e.type === "AREA" && typeof e.normalizedValue === "number" && (e.normalizedValue as number) > 0
  );

  for (const entity of areaEntities) {
    const value = entity.normalizedValue as number;
    const contextStart = Math.max(0, entity.start - 40);
    const context = rawText.slice(contextStart, entity.end + 20).trim();

    if (!extracted.total_land_area && (context.includes("대지") || context.includes("토지") || context.includes("부지"))) {
      extracted.total_land_area = { key: "total_land_area", value: Number(value.toFixed(2)), unit: "㎡", sourceFile, context };
    } else if (!extracted.total_floor_area && (context.includes("연면적") || context.includes("연 면적"))) {
      extracted.total_floor_area = { key: "total_floor_area", value: Number(value.toFixed(2)), unit: "㎡", sourceFile, context };
    }
  }

  const rateEntities = entities.filter(
    (e: Entity) => e.type === "RATE" && typeof e.normalizedValue === "number"
  );

  for (const entity of rateEntities) {
    const valuePercent = (entity.normalizedValue as number) * 100;
    if (valuePercent <= 0 || valuePercent > 1000) continue;

    const contextStart = Math.max(0, entity.start - 40);
    const context = rawText.slice(contextStart, entity.end + 20).trim();

    if (!extracted.floor_area_ratio && (context.includes("용적률") || context.includes("용적율"))) {
      extracted.floor_area_ratio = { key: "floor_area_ratio", value: valuePercent, unit: "%", sourceFile, context };
    } else if (!extracted.building_coverage && (context.includes("건폐율") || context.includes("건폐률"))) {
      extracted.building_coverage = { key: "building_coverage", value: valuePercent, unit: "%", sourceFile, context };
    }
  }

  return extracted;
}

// ─── AI 폴백 추출 ───

export async function extractClaimsWithAI(
  rawText: string,
  sourceFile: string
): Promise<Record<string, ExtractedValue>> {
  const openai = getOpenAIClient();

  const truncated = rawText.slice(0, 8000);

  const claimKeyDescriptions = CLAIM_KEYS.map(
    (k) => `  "${k}": "${CLAIM_LABELS[k]}"`
  ).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `당신은 부동산/건설 사업계획서에서 핵심 재무 수치를 추출하는 전문가입니다.
주어진 문서 텍스트에서 아래 항목들의 수치를 찾아 JSON으로 반환하세요.

추출 가능한 항목 키와 의미:
${claimKeyDescriptions}

반환 형식:
{
  "claims": [
    { "key": "항목키", "value": 숫자, "unit": "단위(억원/만원/%/㎡/세대 등)", "context": "원문에서 해당 수치가 나온 문맥(50자 이내)" }
  ]
}

규칙:
- 문서에서 확실히 발견된 수치만 추출하세요. 추측하지 마세요.
- value는 반드시 숫자여야 합니다 (문자열 X).
- unit은 문서에 표기된 단위 그대로 사용하세요.
- 총사업비, 토지비, 공사비는 "억원" 단위로 통일하세요 (만원/천원 → 억원 변환).
- 면적은 "㎡" 단위로 통일하세요 (평 → ㎡ 변환: 1평 = 3.305785㎡).
- 발견되지 않은 항목은 포함하지 마세요.`,
      },
      {
        role: "user",
        content: `다음 사업계획서에서 핵심 재무 수치를 추출해주세요:\n\n${truncated}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return {};

  try {
    const parsed = JSON.parse(content) as {
      claims?: { key: string; value: number; unit: string; context?: string }[];
    };

    if (!parsed.claims || !Array.isArray(parsed.claims)) return {};

    const extracted: Record<string, ExtractedValue> = {};
    for (const claim of parsed.claims) {
      if (
        !claim.key ||
        typeof claim.value !== "number" ||
        claim.value <= 0 ||
        !CLAIM_KEYS.includes(claim.key as ClaimKey)
      ) {
        continue;
      }

      extracted[claim.key] = {
        key: claim.key,
        value: claim.value,
        unit: claim.unit || "",
        sourceFile,
        context: claim.context || "AI 추출",
      };
    }

    return extracted;
  } catch {
    return {};
  }
}

// ─── 파싱 신뢰도 계산 ───

export function calculateParsingConfidence(
  extractedData: Record<string, ExtractedValue>,
  rawText: string
): number {
  const totalKeys = Object.keys(CLAIM_PATTERNS).length;
  const extractedCount = Object.keys(extractedData).length;

  let score = (extractedCount / totalKeys) * 60;

  const koreanChars = (rawText.match(/[가-힣]/g) || []).length;
  const koreanRatio = koreanChars / Math.max(1, rawText.length);
  if (koreanRatio > 0.2) score += 15;
  if (koreanRatio > 0.3) score += 5;

  if (rawText.length > 1000) score += 10;
  if (rawText.length > 5000) score += 10;

  return Math.min(100, Math.round(score));
}
