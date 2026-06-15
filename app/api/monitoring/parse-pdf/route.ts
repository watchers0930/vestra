/**
 * 등기부등본 PDF 파싱 API
 * POST: PDF 업로드 → 주소·소유자명 추출
 */

import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { parseRegistry } from "@/lib/registry-parser";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = await rateLimit(`parse-registry-pdf:${ip}`, 10);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일을 업로드해주세요." }, { status: 400 });
    }

    const isPDF =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      return NextResponse.json({ error: "PDF 파일만 지원합니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await extractTextFromPDF(buffer, file.name);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "등기부등본 텍스트를 인식할 수 없습니다. 스캔 품질을 확인해주세요." },
        { status: 422 }
      );
    }

    const parsed = parseRegistry(text);

    // 갑구에서 현재 소유자 추출 (말소되지 않은 마지막 소유권 항목)
    const lastOwnerEntry = [...parsed.gapgu]
      .filter((e) => e.purpose.includes("소유권") && !e.isCancelled)
      .pop();
    const ownerName = lastOwnerEntry?.holder || "";

    const realEstateType = parsed.title.isApartment ? "집합건물" : "건물";

    return NextResponse.json({
      address: parsed.title.address,
      ownerName,
      realEstateType,
      rawText: text,
    });
  } catch {
    return NextResponse.json(
      { error: "PDF 파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
