/**
 * 사업성 분석 다중 문서 파서
 *
 * PDF/DOCX/XLSX 파일에서 텍스트를 추출하고
 * 정규식 패턴 매칭으로 핵심 수치(분양가, 공사비 등)를 자동 추출합니다.
 *
 * @module lib/feasibility/document-parser
 */

import { extractText, getDocumentProxy } from "unpdf";
import { join } from "path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { extractTextFromScannedPDF } from "../image-ocr";
import type { ParsedDocument } from "./feasibility-types";
import {
  extractClaims, extractClaimsWithNER, extractClaimsWithAI,
  calculateParsingConfidence,
} from "./document-parser-extractors";

// ─── re-export (기존 import 경로 유지) ───

export {
  extractClaims, extractClaimsFromTextForTest,
  extractClaimsWithNER, extractClaimsWithAI,
  calculateParsingConfidence, CLAIM_PATTERNS,
} from "./document-parser-extractors";

// ─── 파일 유형 감지 ───

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

// ─── 파일별 텍스트 추출 ───

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const cMapUrl = join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    cMapUrl,
    cMapPacked: true,
  });
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
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
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    texts.push(`[시트: ${sheetName}]\n${csv}`);
  }

  return texts.join("\n\n");
}

function extractTextFromHwpFallback(buffer: Buffer): string {
  const text = buffer.toString("utf-8");

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

// ─── 메인 함수 ───

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
      if (!rawText || rawText.trim().length < 10) {
        console.warn(`[document-parser] PDF 텍스트 추출 부족 (${rawText?.trim().length || 0}자), OCR 폴백: ${filename}`);
        try {
          const ocrResult = await extractTextFromScannedPDF(buffer, filename, {
            skipRegistryNormalization: true,
          });
          rawText = ocrResult.text;
          pageCount = ocrResult.pageCount || pageCount;
        } catch (ocrErr) {
          console.warn("[document-parser] OCR 폴백 실패:", ocrErr);
        }
      }
      break;
    }
    case "docx":
      rawText = await extractTextFromDocx(buffer);
      break;
    case "xlsx":
      rawText = extractTextFromXlsx(buffer);
      break;
    case "hwp":
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

  // NER 폴백: 정규식으로 3개 미만 추출 시, AI 전에 NER 파이프라인으로 시도
  if (Object.keys(extractedData).length < 3 && rawText.length > 200) {
    try {
      const nerClaims = extractClaimsWithNER(rawText, filename);
      extractedData = { ...nerClaims, ...extractedData };
    } catch (err) {
      console.warn("NER claim extraction fallback failed:", err);
    }
  }

  // AI 폴백: NER 후에도 3개 미만 추출 시 OpenAI로 재추출
  if (Object.keys(extractedData).length < 3 && rawText.length > 200) {
    try {
      const aiClaims = await extractClaimsWithAI(rawText, filename);
      extractedData = { ...aiClaims, ...extractedData };
    } catch (err) {
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
