import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { extractTextFromImages, extractTextFromScannedPDF, isImageFile } from "@/lib/image-ocr";
import { analyzeContractImage } from "@/lib/contract-image";
import { CONTRACT_OCR_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { checkOpenAICostGuard } from "@/lib/openai";
import { validateOrigin } from "@/lib/csrf";
import { validateMagicBytes } from "@/lib/sanitize";

/** 이미지/스캔 PDF Vision OCR은 지연될 수 있어 타임아웃 상향 (동종 parse-registry와 일치) */
export const maxDuration = 60;

/** 최대 파일 크기: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** 이미지 최대 업로드 수 */
const MAX_IMAGE_COUNT = 5;

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    // Rate limiting (공개 API: 10 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`extract-pdf:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("file");

    if (!files.length || !(files[0] instanceof File)) {
      return NextResponse.json(
        { error: "파일을 업로드해주세요." },
        { status: 400 }
      );
    }

    const firstFile = files[0] as File;

    // 문서 유형 힌트 (contract=계약서 전용 경로, 기본=등기부/범용)
    const isContract = formData.get("docType") === "contract";

    // PDF인지 이미지인지 판별
    const isPDF =
      firstFile.type === "application/pdf" ||
      firstFile.name.toLowerCase().endsWith(".pdf");

    // -----------------------------------------------------------------------
    // PDF 처리 (텍스트 추출 → 실패 시 이미지 변환 후 OCR 폴백)
    // -----------------------------------------------------------------------
    if (isPDF) {
      if (firstFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "파일 크기가 10MB를 초과합니다." },
          { status: 400 }
        );
      }

      const arrayBuffer = await firstFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // 매직바이트 검증 (MIME/확장자 스푸핑 방어)
      if (!validateMagicBytes(buffer, "application/pdf")) {
        return NextResponse.json({ error: "유효한 PDF 파일이 아닙니다." }, { status: 400 });
      }

      try {
        // 1차: 텍스트 기반 PDF 추출 시도
        const result = await extractTextFromPDF(buffer, firstFile.name);
        return NextResponse.json(result);
      } catch {
        // 2차: 스캔 PDF → chat.completions Vision OCR
        console.info("[PDF] 텍스트 추출 실패. Vision API로 스캔 PDF OCR 시도.");

        const costGuard = await checkOpenAICostGuard(ip);
        if (!costGuard.allowed) {
          return NextResponse.json(
            { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
            { status: 429 }
          );
        }

        const result = await extractTextFromScannedPDF(
          buffer,
          firstFile.name,
          isContract
            ? {
                skipRegistryNormalization: true,
                systemPrompt: CONTRACT_OCR_PROMPT,
                userPrompt:
                  "이 부동산 계약서 PDF에서 모든 텍스트를 추출해주세요. 금액·날짜·기간·특약 등을 빠짐없이 포함해주세요.",
              }
            : undefined
        );
        return NextResponse.json(result);
      }
    }

    // -----------------------------------------------------------------------
    // 이미지 처리 (Tesseract 우선, GPT-4o 폴백)
    // -----------------------------------------------------------------------
    const imageFiles = files.filter(
      (f): f is File => f instanceof File
    );

    if (imageFiles.length > MAX_IMAGE_COUNT) {
      return NextResponse.json(
        { error: `이미지는 최대 ${MAX_IMAGE_COUNT}장까지 업로드할 수 있습니다.` },
        { status: 400 }
      );
    }

    // 개별 파일 검증 + 버퍼 변환
    const images: { buffer: Buffer; mimeType: string }[] = [];

    for (const imgFile of imageFiles) {
      if (!isImageFile(imgFile)) {
        return NextResponse.json(
          { error: `지원하지 않는 파일 형식입니다: ${imgFile.name}. PDF, JPG, PNG 파일만 지원합니다.` },
          { status: 400 }
        );
      }

      if (imgFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `파일 크기가 10MB를 초과합니다: ${imgFile.name}` },
          { status: 400 }
        );
      }

      const ab = await imgFile.arrayBuffer();
      const imgBuffer = Buffer.from(ab);
      // 매직바이트 검증 (MIME/확장자 스푸핑 방어)
      if (!validateMagicBytes(imgBuffer, imgFile.type || "image/jpeg")) {
        return NextResponse.json(
          { error: `유효한 이미지 파일이 아닙니다: ${imgFile.name}` },
          { status: 400 }
        );
      }
      images.push({
        buffer: imgBuffer,
        mimeType: imgFile.type || "image/jpeg",
      });
    }

    // 비용 가드
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const label =
      imageFiles.length === 1 ? imageFiles[0].name : `${imageFiles.length}개 이미지`;

    // 계약서 이미지: OCR + 이미지 무결성 신호를 단일 Vision 호출로 처리
    if (isContract) {
      const { text, integrity } = await analyzeContractImage(images);
      return NextResponse.json({
        text,
        pageCount: images.length,
        fileName: `${label} (계약서 AI OCR)`,
        charCount: text.length,
        isRegistry: false,
        confidence: 0,
        contractIntegrity: integrity,
      });
    }

    const result = await extractTextFromImages(images, label);

    return NextResponse.json(result);
  } catch (error: unknown) {
    // 판독불가(흐린 스캔) 에러는 조작 대신 사용자에게 재업로드를 안내
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("선명한 파일")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return handleApiError(error, "PDF 추출");
  }
}
