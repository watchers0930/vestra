/**
 * 사업성 분석 다중 문서 파서
 *
 * PDF/DOCX/XLSX 파일에서 텍스트를 추출하고
 * 정규식 패턴 매칭으로 핵심 수치(분양가, 공사비 등)를 자동 추출합니다.
 *
 * @module lib/feasibility/document-parser
 */

import { extractText } from "unpdf";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { getOpenAIClient } from "../openai";
import type { ParsedDocument, ExtractedValue, ClaimKey } from "./feasibility-types";
import { CLAIM_KEYS, CLAIM_LABELS } from "./feasibility-types";

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

// ---------------------------------------------------------------------------
// 주장 추출 정규식 패턴
// ---------------------------------------------------------------------------

interface ClaimPattern {
  patterns: RegExp[];
  unit: string;
}

const CLAIM_PATTERNS: Partial<Record<ClaimKey, ClaimPattern>> = {
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

// ---------------------------------------------------------------------------
// 파일 유형 감지
// ---------------------------------------------------------------------------

type FileType = "pdf" | "docx" | "xlsx" | "hwp";

function detectFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
    case "doc":
      return "docx";
    case "xlsx":
    case "xls":
    case "csv":
      return "xlsx";
    case "hwp":
    case "hwpx":
      return "hwp";
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
  }
}

// ---------------------------------------------------------------------------
// 파일별 텍스트 추출
// ---------------------------------------------------------------------------

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const { totalPages, text } = await extractText(
    new Uint8Array(buffer),
    { mergePages: true }
  );
  return { text, pageCount: totalPages || 0 };
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractTextFromXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const texts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // CSV 형태로 추출하여 정규식 매칭 가능하게 함
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    texts.push(`[시트: ${sheetName}]\n${csv}`);
  }

  return texts.join("\n\n");
}

// ---------------------------------------------------------------------------
// 수치 추출
// ---------------------------------------------------------------------------

function parseNumber(raw: string): number {
  // 쉼표 제거, 숫자만 추출
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
      "building_coverage",
      parseNumber(ratioSource[1]),
      "%",
      sourceFile,
      context
    );
    const floorAreaRatioValue = buildExtractedValue(
      "floor_area_ratio",
      parseNumber(ratioSource[2]),
      "%",
      sourceFile,
      context
    );

    if (buildingCoverageValue) extracted.building_coverage = buildingCoverageValue;
    if (floorAreaRatioValue) extracted.floor_area_ratio = floorAreaRatioValue;
  }

  const pfRateMatch = normalizedText.match(/PF대출\s+자기자본[\s\S]*?([0-9.]+)%\(?예정\)?/);
  if (pfRateMatch) {
    const pfRateValue = buildExtractedValue(
      "pf_interest_rate",
      parseNumber(pfRateMatch[1]),
      "%",
      sourceFile,
      pfRateMatch[0]
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
      "억원",
      sourceFile,
      totalProjectCostMatch[0]
    );
    if (totalProjectCostValue) extracted.total_project_cost = totalProjectCostValue;
  }

  return extracted;
}

function extractClaims(
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

          // 원문 컨텍스트 (매칭 주변 50자)
          const matchIndex = normalizedText.indexOf(match[0]);
          const contextStart = Math.max(0, matchIndex - 30);
          const contextEnd = Math.min(normalizedText.length, matchIndex + match[0].length + 30);
          const context = normalizedText.slice(contextStart, contextEnd).trim();

          const extractedValue = buildExtractedValue(key, finalValue, finalUnit, sourceFile, context);
          if (extractedValue) {
            extracted[key] = extractedValue;
            break; // 첫 번째 매칭만 사용
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

// ---------------------------------------------------------------------------
// AI 폴백 추출 (정규식 추출 결과가 빈약할 때)
// ---------------------------------------------------------------------------

async function extractClaimsWithAI(
  rawText: string,
  sourceFile: string
): Promise<Record<string, ExtractedValue>> {
  const openai = getOpenAIClient();

  // 토큰 절약을 위해 텍스트 앞부분만 사용 (최대 8000자)
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

// ---------------------------------------------------------------------------
// 파싱 신뢰도 계산
// ---------------------------------------------------------------------------

function calculateParsingConfidence(
  extractedData: Record<string, ExtractedValue>,
  rawText: string
): number {
  const totalKeys = Object.keys(CLAIM_PATTERNS).length;
  const extractedCount = Object.keys(extractedData).length;

  // 기본 점수: 추출된 항목 비율
  let score = (extractedCount / totalKeys) * 60;

  // 텍스트 품질 보너스
  const koreanChars = (rawText.match(/[가-힣]/g) || []).length;
  const koreanRatio = koreanChars / Math.max(1, rawText.length);
  if (koreanRatio > 0.2) score += 15;
  if (koreanRatio > 0.3) score += 5;

  // 텍스트 길이 보너스
  if (rawText.length > 1000) score += 10;
  if (rawText.length > 5000) score += 10;

  return Math.min(100, Math.round(score));
}

// ---------------------------------------------------------------------------
// 메인 함수
// ---------------------------------------------------------------------------

export async function parseDocument(
  input: File | { buffer: Buffer; name: string; size: number }
): Promise<ParsedDocument> {
  let buffer: Buffer;
  let filename: string;
  let fileSize: number;

  if (input instanceof File) {
    buffer = Buffer.from(await input.arrayBuffer());
    filename = input.name;
    fileSize = input.size;
  } else {
    buffer = input.buffer;
    filename = input.name;
    fileSize = input.size;
  }

  const fileType = detectFileType(filename);
  let rawText: string;
  let pageCount: number | undefined;

  switch (fileType) {
    case "pdf": {
      const result = await extractTextFromPdf(buffer);
      rawText = result.text;
      pageCount = result.pageCount;
      break;
    }
    case "docx":
      rawText = await extractTextFromDocx(buffer);
      break;
    case "xlsx":
      rawText = extractTextFromXlsx(buffer);
      break;
    case "hwp":
      // HWP는 바이너리 포맷이라 완벽한 파싱이 어려움
      // 텍스트 추출 시도 후 실패하면 안내 메시지
      rawText = extractTextFromHwpFallback(buffer);
      break;
    default:
      throw new Error(`지원하지 않는 파일 형식: ${fileType}`);
  }

  if (!rawText || rawText.trim().length < 10) {
    throw new Error(
      `${filename}: 텍스트를 추출할 수 없습니다. ` +
        "스캔된 이미지 파일이거나 비어있는 문서일 수 있습니다."
    );
  }

  let extractedData = extractClaims(rawText, filename);

  // AI 폴백: 정규식으로 3개 미만 추출 시 OpenAI로 재추출
  if (Object.keys(extractedData).length < 3 && rawText.length > 200) {
    try {
      const aiClaims = await extractClaimsWithAI(rawText, filename);
      // AI 결과를 병합 (정규식 결과 우선)
      extractedData = { ...aiClaims, ...extractedData };
    } catch (err) {
      // AI 폴백 실패 시 정규식 결과만 사용 (무시)
      console.warn("AI claim extraction fallback failed:", err);
    }
  }

  return {
    filename,
    fileType,
    fileSize,
    extractedData,
    rawText,
    confidence: calculateParsingConfidence(extractedData, rawText),
    pageCount,
  };
}

// ---------------------------------------------------------------------------
// HWP Fallback (기본 텍스트 추출 시도)
// ---------------------------------------------------------------------------

function extractTextFromHwpFallback(buffer: Buffer): string {
  // HWP 파일의 바이너리에서 텍스트 영역을 단순 추출
  // 완전한 파싱은 아니지만 대부분의 한글 텍스트를 추출 가능
  const text = buffer.toString("utf-8");

  // UTF-8로 디코딩 가능한 한글 텍스트만 추출
  const koreanText = text.match(/[가-힣0-9a-zA-Z\s,.%()~\-:]+/g);
  if (!koreanText) {
    throw new Error(
      "HWP 파일에서 텍스트를 추출할 수 없습니다. " +
        "PDF 또는 DOCX로 변환 후 업로드해주세요."
    );
  }

  return koreanText
    .filter((chunk) => chunk.trim().length > 3)
    .join(" ");
}
