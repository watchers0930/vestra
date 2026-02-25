import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { extractTextFromImages, isImageFile } from "@/lib/image-ocr";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { checkOpenAICostGuard } from "@/lib/openai";

/** 최대 파일 크기: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** 이미지 최대 업로드 수 */
const MAX_IMAGE_COUNT = 5;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (공개 API: 10 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = rateLimit(`extract-pdf:${ip}`, 10);
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

      try {
        // 1차: 텍스트 기반 PDF 추출 시도
        const result = await extractTextFromPDF(buffer, firstFile.name);
        return NextResponse.json(result);
      } catch {
        // 2차: 스캔 PDF → 페이지별 이미지 변환 → OCR 폴백
        console.log("[PDF] 텍스트 추출 실패. 이미지 변환 후 OCR 시도.");

        const costGuard = checkOpenAICostGuard(ip);
        if (!costGuard.allowed) {
          return NextResponse.json(
            { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
            { status: 429 }
          );
        }

        const { renderPageAsImage, getDocumentProxy } = await import("unpdf");
        const doc = await getDocumentProxy(new Uint8Array(buffer));
        const pageCount = Math.min(doc.numPages, 5); // 최대 5페이지
        const images: { buffer: Buffer; mimeType: string }[] = [];

        for (let i = 1; i <= pageCount; i++) {
          const imgResult = await renderPageAsImage(doc, i, { scale: 2 });
          images.push({
            buffer: Buffer.from(imgResult),
            mimeType: "image/png",
          });
        }

        const result = await extractTextFromImages(
          images,
          `${firstFile.name} (스캔 PDF → OCR)`
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
      images.push({
        buffer: Buffer.from(ab),
        mimeType: imgFile.type || "image/jpeg",
      });
    }

    // 비용 가드 (GPT-4o 폴백 가능성 대비)
    const costGuard = checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const result = await extractTextFromImages(
      images,
      imageFiles.length === 1
        ? imageFiles[0].name
        : `${imageFiles.length}개 이미지`
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Document extract error:", message);
    return NextResponse.json(
      { error: `텍스트 추출 오류: ${message}` },
      { status: 500 }
    );
  }
}
