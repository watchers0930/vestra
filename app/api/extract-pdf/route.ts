import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/** 최대 파일 크기: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF 파일을 업로드해주세요." },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 10MB를 초과합니다." },
        { status: 400 }
      );
    }

    // MIME 타입 검증
    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      return NextResponse.json(
        { error: "PDF 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // File → Buffer 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF 텍스트 추출
    const result = await extractTextFromPDF(buffer, file.name);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("PDF extract error:", message);
    return NextResponse.json(
      { error: `PDF 텍스트 추출 오류: ${message}` },
      { status: 500 }
    );
  }
}
