/**
 * PDF 텍스트 추출 유틸리티
 *
 * 등기부등본/계약서 PDF에서 텍스트를 추출하는 서버사이드 모듈입니다.
 * AI에 의존하지 않는 순수 TypeScript 기반 자체 OCR 파싱 기술입니다.
 *
 * unpdf (서버사이드 전용 PDF.js 래퍼) 를 사용하여
 * Node.js 환경에서 안정적으로 PDF 텍스트를 추출합니다.
 *
 * @module lib/pdf-parser
 */

import { extractText } from "unpdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFExtractResult {
  /** 추출된 전체 텍스트 */
  text: string;
  /** PDF 페이지 수 */
  pageCount: number;
  /** 원본 파일명 */
  fileName: string;
  /** 추출된 텍스트 글자 수 */
  charCount: number;
  /** 등기부등본 감지 여부 */
  isRegistry: boolean;
  /** 텍스트 추출 신뢰도 (0~100) */
  confidence: number;
}

// ---------------------------------------------------------------------------
// 등기부등본 감지 키워드
// ---------------------------------------------------------------------------

const REGISTRY_KEYWORDS = [
  "표제부",
  "갑구",
  "을구",
  "소유권",
  "근저당",
  "등기부등본",
  "건물의 표시",
  "토지의 표시",
  "소유권에 관한 사항",
  "소유권 이외의 권리",
  "대지권",
  "등기목적",
  "접수",
  "순위번호",
];

// ---------------------------------------------------------------------------
// 텍스트 후처리 (등기부등본 특화)
// ---------------------------------------------------------------------------

export function normalizeRegistryText(raw: string): string {
  let text = raw;

  // 1. CRLF → LF 통일
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. 페이지 구분자 제거 (--- Page X ---, [Page X] 등)
  text = text.replace(/[-=]{3,}\s*Page\s*\d+\s*[-=]{3,}/gi, "\n");
  text = text.replace(/\[?\s*페이지?\s*\d+\s*\]?/g, "");

  // 3. PDF 추출시 발생하는 다중 공백 정리
  text = text.replace(/[ \t]{3,}/g, "  ");

  // 4. 연속 빈줄 정리 (3줄 이상 → 2줄)
  text = text.replace(/\n{4,}/g, "\n\n\n");

  // 5. 줄 시작/끝 공백 정리
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  // 6. 전체 앞뒤 공백 정리
  text = text.trim();

  return text;
}

// ---------------------------------------------------------------------------
// 등기부등본 감지 및 신뢰도 계산
// ---------------------------------------------------------------------------

export function detectRegistryConfidence(text: string): {
  isRegistry: boolean;
  confidence: number;
} {
  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of REGISTRY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }

  // 신뢰도 = (매칭 키워드 수 / 최소 필요 키워드 수) × 100, 최대 100
  const confidence = Math.min(100, Math.round((matchCount / 5) * 100));
  const isRegistry = matchCount >= 3; // 3개 이상 키워드 매칭시 등기부등본으로 판단

  return { isRegistry, confidence };
}

// ---------------------------------------------------------------------------
// 텍스트 품질 평가 (스캔 PDF vs 텍스트 PDF 구분)
// ---------------------------------------------------------------------------

function assessTextQuality(text: string, pageCount: number): number {
  if (!text || text.length === 0) return 0;

  // 페이지당 평균 글자수
  const charsPerPage = text.length / Math.max(1, pageCount);

  // 한글 비율
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const koreanRatio = koreanChars / text.length;

  // 의미 있는 텍스트 기준:
  // - 페이지당 100자 이상
  // - 한글 비율 10% 이상 (한국 문서)
  if (charsPerPage < 50) return 10; // 거의 비어있음 (스캔 PDF 가능성)
  if (koreanRatio < 0.05) return 30; // 한글이 거의 없음

  let quality = 50;
  if (charsPerPage > 200) quality += 20;
  if (charsPerPage > 500) quality += 10;
  if (koreanRatio > 0.2) quality += 10;
  if (koreanRatio > 0.3) quality += 10;

  return Math.min(100, quality);
}

// ---------------------------------------------------------------------------
// 메인 함수: PDF → 텍스트 추출
// ---------------------------------------------------------------------------

export async function extractTextFromPDF(
  buffer: Buffer,
  fileName: string = "document.pdf"
): Promise<PDFExtractResult> {
  // unpdf로 텍스트 추출 (서버사이드 전용, DOMMatrix 등 브라우저 API 불필요)
  const { totalPages, text: rawText } = await extractText(
    new Uint8Array(buffer),
    { mergePages: true }
  );

  const pageCount = totalPages || 0;

  // 텍스트 품질 평가
  const quality = assessTextQuality(rawText, pageCount);

  if (quality < 20) {
    throw new Error(
      "PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다. " +
        "인터넷등기소(iros.go.kr)에서 다운로드한 텍스트 기반 PDF를 사용해주세요."
    );
  }

  // 등기부등본 특화 후처리
  const normalizedText = normalizeRegistryText(rawText);

  // 등기부등본 감지
  const { isRegistry, confidence } = detectRegistryConfidence(normalizedText);

  return {
    text: normalizedText,
    pageCount,
    fileName,
    charCount: normalizedText.length,
    isRegistry,
    confidence,
  };
}
