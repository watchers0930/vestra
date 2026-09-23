/**
 * 이미지 OCR 텍스트 추출 유틸리티
 *
 * 등기부등본 이미지(JPG/PNG)에서 텍스트를 추출하는 서버사이드 모듈입니다.
 * GPT-4.1-mini Vision API를 사용하여 Vercel 서버리스 환경에서도 안정적으로 동작합니다.
 *
 * @module lib/image-ocr
 */

import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import { IMAGE_OCR_PROMPT } from "@/lib/prompts";
import {
  normalizeRegistryText,
  detectRegistryConfidence,
  type PDFExtractResult,
} from "@/lib/pdf-parser";
import { renderPdfToImages } from "@/lib/pdf-render";

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function isImageFile(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * OCR 결과가 판독불가/과다 불확실이면 조작된 텍스트로 분석되지 않도록 사용자에게
 * 재업로드를 유도하는 에러를 던진다. (흐린 스캔에서 모델이 예시값을 지어내는 것 방지)
 */
export function assertLegibleOcr(text: string): void {
  const t = (text || "").trim();
  const compact = t.replace(/\s/g, "");
  if (compact.length < 15 || /^판독\s*불가/.test(t) || compact === "판독불가") {
    throw new Error(
      "스캔·사진이 흐리거나 옆으로 눕혀져 있어 읽지 못했습니다. 문서를 똑바로 세우고 선명하게 다시 올려주세요."
    );
  }
  const qMarks = (t.match(/\[\?\]/g) || []).length;
  const meaningful = compact.length || 1;
  if (qMarks >= 10 && qMarks / meaningful > 0.06) {
    throw new Error(
      "스캔·사진이 흐려 일부만 인식됐습니다. 문서를 똑바로 세우고 더 선명하게 다시 올려주세요."
    );
  }
}

// ---------------------------------------------------------------------------
// GPT Vision OCR (메인 엔진)
// ---------------------------------------------------------------------------

async function extractWithVision(
  images: { buffer: Buffer; mimeType: string }[],
  options?: { systemPrompt?: string; userPrompt?: string }
): Promise<string> {
  const openai = getOpenAIClient();

  const systemPrompt = options?.systemPrompt ?? IMAGE_OCR_PROMPT;
  const userText =
    options?.userPrompt ?? "이 등기부등본 이미지에서 모든 텍스트를 추출해주세요.";

  const imageContents = images.map((img) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${img.mimeType};base64,${img.buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              ...imageContents,
            ],
          },
        ],
        reasoning_effort: "low",
        max_completion_tokens: 16384,
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      if (text.length >= 20) return text;

      console.warn(`[Vision OCR] 시도 ${attempt}/${MAX_RETRIES}: 추출 텍스트 부족 (${text.length}자)`);
    } catch (error) {
      console.warn(`[Vision OCR] 시도 ${attempt}/${MAX_RETRIES} 실패:`, error);
      if (attempt === MAX_RETRIES) throw error;
    }

    // 지수 백오프 대기
    await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
  }

  return "";
}

// ---------------------------------------------------------------------------
// 스캔 PDF → chat.completions (PDF를 이미지로 취급하여 OCR)
// ---------------------------------------------------------------------------

export async function extractTextFromScannedPDF(
  buffer: Buffer,
  fileName: string,
  options?: {
    skipRegistryNormalization?: boolean;
    /** OCR 시스템 프롬프트 override (기본: 등기부 전용) */
    systemPrompt?: string;
    /** user 지시문 override */
    userPrompt?: string;
  }
): Promise<PDFExtractResult> {
  // 1) 서버 렌더 → 이미지 OCR (회전 플래그 반영 → 눕힌 스캔의 상단 표 누락 방지).
  //    렌더 성공 후의 OCR 판독불가 에러는 그대로 전파한다(같은 원본이라 폴백해도 무의미).
  //    렌더 자체 실패(네이티브 canvas 미로드 등)만 아래 Responses API 경로로 폴백한다.
  let renderedImages: { buffer: Buffer; mimeType: string }[] | null = null;
  try {
    renderedImages = await renderPdfToImages(buffer);
  } catch (renderErr) {
    console.warn(`[PDF OCR] 서버 렌더 실패 → Responses API 폴백: ${fileName}`, renderErr);
  }
  if (renderedImages) {
    console.info(`[PDF OCR] 서버 렌더 후 이미지 OCR: ${fileName} (${renderedImages.length}p)`);
    return extractTextFromImages(renderedImages, `${fileName} (스캔 PDF → 렌더 OCR)`, {
      systemPrompt: options?.systemPrompt,
      userPrompt:
        options?.userPrompt ??
        (options?.skipRegistryNormalization
          ? "이 PDF 문서의 모든 텍스트를 표·숫자·항목 빠짐없이 추출해주세요."
          : undefined),
      skipRegistryNormalization: options?.skipRegistryNormalization,
    });
  }

  // 2) 폴백: 기존 Responses API input_file 경로
  const openai = getOpenAIClient();
  const base64 = buffer.toString("base64");

  console.info(`[PDF OCR] Responses API input_file로 스캔 PDF 처리(폴백): ${fileName}`);

  let extractedText = "";
  const systemPrompt = options?.systemPrompt ?? IMAGE_OCR_PROMPT;
  const userPrompt =
    options?.userPrompt ??
    (options?.skipRegistryNormalization
      ? "이 PDF 문서에서 모든 텍스트를 추출해주세요. 표, 숫자, 항목 등을 빠짐없이 포함해주세요."
      : "이 등기부등본 PDF에서 모든 텍스트를 추출해주세요.");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.responses.create({
        model: OPENAI_MODEL,
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "input_text", text: userPrompt },
              {
                type: "input_file",
                filename: fileName,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            ],
          },
        ],
      });

      extractedText = response.output_text?.trim() || "";
      if (extractedText.length >= 20) break;

      console.warn(`[PDF OCR] 시도 ${attempt}/${MAX_RETRIES}: 추출 텍스트 부족 (${extractedText.length}자)`);
    } catch (error) {
      console.warn(`[PDF OCR] 시도 ${attempt}/${MAX_RETRIES} 실패:`, error);
      if (attempt === MAX_RETRIES) throw error;
    }

    await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
  }

  // 판독불가·과다 불확실 → 조작 텍스트로 분석되지 않도록 차단
  assertLegibleOcr(extractedText);
  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "PDF에서 텍스트를 추출할 수 없습니다. 텍스트가 포함된 PDF를 업로드해주세요."
    );
  }

  // 등기부등본이 아닌 일반 문서는 정규화 스킵
  if (options?.skipRegistryNormalization) {
    return {
      text: extractedText,
      pageCount: 1,
      fileName: `${fileName} (스캔 PDF → AI OCR)`,
      charCount: extractedText.length,
      isRegistry: false,
      confidence: 0,
    };
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
  fileName: string = "image.jpg",
  options?: {
    systemPrompt?: string;
    userPrompt?: string;
    skipRegistryNormalization?: boolean;
  }
): Promise<PDFExtractResult> {
  const extractedText = await extractWithVision(images, {
    systemPrompt: options?.systemPrompt,
    userPrompt: options?.userPrompt,
  });

  assertLegibleOcr(extractedText);
  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      "이미지에서 텍스트를 추출할 수 없습니다. 선명한 문서 이미지를 업로드해주세요."
    );
  }

  // 등기부가 아닌 일반 문서(계약서 등)는 등기부 정규화 스킵
  if (options?.skipRegistryNormalization) {
    return {
      text: extractedText,
      pageCount: images.length,
      fileName: `${fileName} (AI OCR)`,
      charCount: extractedText.length,
      isRegistry: false,
      confidence: 0,
    };
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
