/**
 * 이미지 OCR 텍스트 추출 유틸리티
 *
 * 등기부등본 이미지(JPG/PNG)에서 텍스트를 추출하는 서버사이드 모듈입니다.
 * 1차: Tesseract.js (자체 OCR, 무료) — 타임아웃 15초
 * 2차: GPT-4o Vision (AI OCR, 폴백)
 *
 * @module lib/image-ocr
 */

import { getOpenAIClient } from "@/lib/openai";
import { IMAGE_OCR_PROMPT } from "@/lib/prompts";
import {
  normalizeRegistryText,
  detectRegistryConfidence,
  type PDFExtractResult,
} from "@/lib/pdf-parser";

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

/** Tesseract 신뢰도가 이 값 미만이면 GPT-4o로 폴백 */
const TESSERACT_CONFIDENCE_THRESHOLD = 60;

/** Tesseract 추출 텍스트에서 한글 비율이 이 값 미만이면 폴백 */
const KOREAN_RATIO_THRESHOLD = 0.1;

/** Tesseract 타임아웃 (ms) */
const TESSERACT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function isImageFile(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

function getKoreanRatio(text: string): number {
  if (!text) return 0;
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  return koreanChars / text.length;
}

/** Promise에 타임아웃을 적용 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 타임아웃 (${ms}ms)`)), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

// ---------------------------------------------------------------------------
// Tesseract.js OCR (자체 엔진) — 동적 import로 워커 경로 문제 우회
// ---------------------------------------------------------------------------

async function extractWithTesseract(
  images: { buffer: Buffer; mimeType: string }[]
): Promise<{ text: string; confidence: number }> {
  // 동적 import로 Turbopack 번들링 우회
  const Tesseract = await import("tesseract.js");
  const recognize = Tesseract.default?.recognize ?? Tesseract.recognize;

  const results: string[] = [];
  let totalConfidence = 0;

  for (const img of images) {
    const { data } = await recognize(img.buffer, "kor+eng");
    results.push(data.text);
    totalConfidence += data.confidence;
  }

  return {
    text: results.join("\n\n"),
    confidence: totalConfidence / images.length,
  };
}

// ---------------------------------------------------------------------------
// GPT-4o Vision OCR (AI 폴백)
// ---------------------------------------------------------------------------

async function extractWithVision(
  images: { buffer: Buffer; mimeType: string }[]
): Promise<string> {
  const openai = getOpenAIClient();

  const imageContents = images.map((img) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${img.mimeType};base64,${img.buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: IMAGE_OCR_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "이 등기부등본 이미지에서 모든 텍스트를 추출해주세요." },
          ...imageContents,
        ],
      },
    ],
    max_tokens: 16384,
    temperature: 0,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

// ---------------------------------------------------------------------------
// 스캔 PDF → GPT-4o 직접 처리 (canvas 의존성 없이 PDF OCR)
// ---------------------------------------------------------------------------

export async function extractTextFromScannedPDF(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractResult> {
  const openai = getOpenAIClient();
  const base64 = buffer.toString("base64");

  console.log(`[PDF OCR] GPT-4o Responses API로 스캔 PDF 직접 처리: ${fileName}`);

  const response = await openai.responses.create({
    model: "gpt-4o",
    instructions: IMAGE_OCR_PROMPT,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "이 등기부등본 PDF에서 모든 텍스트를 추출해주세요." },
          {
            type: "input_file",
            filename: fileName,
            file_data: `data:application/pdf;base64,${base64}`,
          },
        ],
      },
    ],
    max_output_tokens: 16384,
    temperature: 0,
  });

  const extractedText = response.output_text || "";

  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "PDF에서 텍스트를 추출할 수 없습니다. 선명한 등기부등본을 업로드해주세요."
    );
  }

  // 후처리
  const normalizedText = normalizeRegistryText(extractedText);
  const { isRegistry, confidence } = detectRegistryConfidence(normalizedText);

  return {
    text: normalizedText,
    pageCount: 1,
    fileName: `${fileName} (스캔 PDF → AI OCR)`,
    charCount: normalizedText.length,
    isRegistry,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// 메인 함수: 이미지 → 텍스트 추출 (Tesseract 우선, 폴백 GPT-4o)
// ---------------------------------------------------------------------------

export async function extractTextFromImages(
  images: { buffer: Buffer; mimeType: string }[],
  fileName: string = "image.jpg"
): Promise<PDFExtractResult> {
  let extractedText = "";
  let usedEngine: "tesseract" | "gpt4o" = "tesseract";

  // 1차: Tesseract.js 시도 (타임아웃 적용)
  try {
    const tesseractResult = await withTimeout(
      extractWithTesseract(images),
      TESSERACT_TIMEOUT_MS,
      "Tesseract"
    );
    const koreanRatio = getKoreanRatio(tesseractResult.text);

    if (
      tesseractResult.confidence >= TESSERACT_CONFIDENCE_THRESHOLD &&
      koreanRatio >= KOREAN_RATIO_THRESHOLD &&
      tesseractResult.text.length >= 100
    ) {
      extractedText = tesseractResult.text;
      usedEngine = "tesseract";
    } else {
      // 신뢰도 부족 → GPT-4o 폴백
      console.log(
        `[OCR] Tesseract 신뢰도 부족 (confidence: ${tesseractResult.confidence.toFixed(1)}%, ` +
        `한글비율: ${(koreanRatio * 100).toFixed(1)}%, 길이: ${tesseractResult.text.length}). GPT-4o 폴백.`
      );
      extractedText = await extractWithVision(images);
      usedEngine = "gpt4o";
    }
  } catch (err) {
    // Tesseract 실패/타임아웃 → GPT-4o 폴백
    const reason = err instanceof Error ? err.message : "알 수 없는 오류";
    console.log(`[OCR] Tesseract 실패 (${reason}). GPT-4o Vision 폴백.`);
    extractedText = await extractWithVision(images);
    usedEngine = "gpt4o";
  }

  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "이미지에서 텍스트를 추출할 수 없습니다. 선명한 등기부등본 이미지를 업로드해주세요."
    );
  }

  // 후처리
  const normalizedText = normalizeRegistryText(extractedText);
  const { isRegistry, confidence } = detectRegistryConfidence(normalizedText);

  return {
    text: normalizedText,
    pageCount: images.length,
    fileName: `${fileName} (${usedEngine === "tesseract" ? "자체 OCR" : "AI OCR"})`,
    charCount: normalizedText.length,
    isRegistry,
    confidence,
  };
}
