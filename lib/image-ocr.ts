/**
 * 이미지 OCR 텍스트 추출 유틸리티
 *
 * 등기부등본 이미지(JPG/PNG)에서 텍스트를 추출하는 서버사이드 모듈입니다.
 * GPT-4.1-mini Vision API를 사용하여 Vercel 서버리스 환경에서도 안정적으로 동작합니다.
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

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function isImageFile(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

// ---------------------------------------------------------------------------
// GPT Vision OCR (메인 엔진)
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
    model: "gpt-4.1-mini",
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
// 스캔 PDF → chat.completions (PDF를 이미지로 취급하여 OCR)
// ---------------------------------------------------------------------------

export async function extractTextFromScannedPDF(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractResult> {
  const openai = getOpenAIClient();
  const base64 = buffer.toString("base64");

  console.log(`[PDF OCR] chat.completions Vision으로 스캔 PDF 처리: ${fileName}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: IMAGE_OCR_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "이 등기부등본 PDF에서 모든 텍스트를 추출해주세요." },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 16384,
    temperature: 0,
  });

  const extractedText = completion.choices[0]?.message?.content?.trim() || "";

  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "PDF에서 텍스트를 추출할 수 없습니다. 선명한 등기부등본을 업로드해주세요."
    );
  }

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
// 메인 함수: 이미지 → 텍스트 추출 (GPT Vision)
// ---------------------------------------------------------------------------

export async function extractTextFromImages(
  images: { buffer: Buffer; mimeType: string }[],
  fileName: string = "image.jpg"
): Promise<PDFExtractResult> {
  const extractedText = await extractWithVision(images);

  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "이미지에서 텍스트를 추출할 수 없습니다. 선명한 등기부등본 이미지를 업로드해주세요."
    );
  }

  const normalizedText = normalizeRegistryText(extractedText);
  const { isRegistry, confidence } = detectRegistryConfidence(normalizedText);

  return {
    text: normalizedText,
    pageCount: images.length,
    fileName: `${fileName} (AI OCR)`,
    charCount: normalizedText.length,
    isRegistry,
    confidence,
  };
}
