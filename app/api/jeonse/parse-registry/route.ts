import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { extractTextFromScannedPDF, extractTextFromImages, isImageFile } from "@/lib/image-ocr";
import { parseRegistry } from "@/lib/registry-parser";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateMagicBytes } from "@/lib/sanitize";
import { checkOpenAICostGuard } from "@/lib/openai";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 스캔/이미지 PDF는 AI OCR(Responses API, 재시도 포함)로 처리하므로 시간 여유 확보
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = await rateLimit(`jeonse-parse-registry:${ip}`, 10);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const isPDF =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = isImageFile(file as File);
    if (!isPDF && !isImage) {
      return NextResponse.json({ error: "PDF 또는 이미지(JPG·PNG) 파일만 지원합니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // 매직바이트 검증 (MIME/확장자 스푸핑 방어)
    const expectedMime = isPDF ? "application/pdf" : (file.type || "image/jpeg");
    if (!validateMagicBytes(buffer, expectedMime)) {
      return NextResponse.json({ error: "유효한 파일이 아닙니다." }, { status: 400 });
    }

    const fileName = file.name ?? "registry";

    // ── 텍스트 추출: 텍스트 PDF → 실패 시 스캔 OCR 폴백 / 이미지 → AI OCR ──
    let text = "";
    let ocrUsed = false;

    if (isPDF) {
      try {
        // 1차: 텍스트 기반 PDF 추출
        const r = await extractTextFromPDF(buffer, fileName);
        text = r.text;
      } catch {
        // 2차: 스캔/이미지 PDF → AI OCR (비용 발생 → 가드)
        const costGuard = await checkOpenAICostGuard(ip);
        if (!costGuard.allowed) {
          return NextResponse.json(
            { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
            { status: 429 }
          );
        }
        const r = await extractTextFromScannedPDF(buffer, fileName);
        text = r.text;
        ocrUsed = true;
      }
    } else {
      // 이미지(JPG/PNG) → AI OCR (비용 발생 → 가드)
      const costGuard = await checkOpenAICostGuard(ip);
      if (!costGuard.allowed) {
        return NextResponse.json(
          { error: "일일 AI 분석 한도에 도달했습니다. 내일 다시 시도해주세요." },
          { status: 429 }
        );
      }
      const r = await extractTextFromImages(
        [{ buffer, mimeType: file.type || "image/jpeg" }],
        fileName
      );
      text = r.text;
      ocrUsed = true;
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "텍스트를 추출할 수 없습니다. 등기부등본 원본(PDF·선명한 이미지)인지 확인해 주세요." },
        { status: 422 }
      );
    }

    const parsed = parseRegistry(text);

    // 표제부 주소
    const address = parsed.title?.address ?? "";

    // 현재 소유자: 갑구에서 말소 안 된 소유권 관련 항목 중 마지막
    const ownerEntry = [...parsed.gapgu]
      .reverse()
      .find((e) => !e.isCancelled && (e.purpose.includes("소유권") || e.purpose.includes("보존")));
    const ownerName = ownerEntry?.holder ?? "";

    // 선순위 채권액: summary에서 직접 가져옴 (이미 말소 제외 합계)
    const totalMortgage = parsed.summary.totalMortgageAmount ?? 0;

    // 근저당 자동반영 결과 요약용 건수 (활성/말소) — 부기등기는 신규채권 아님이라 활성 집계 제외
    const mortgageActiveCount = parsed.eulgu.filter(
      (e) => /근저당|저당/.test(e.purpose) && !e.isCancelled && !e.isSupplementary
    ).length;
    const mortgageCancelledCount = parsed.eulgu.filter(
      (e) => /근저당|저당/.test(e.purpose) && e.isCancelled
    ).length;

    // 등기 위험 요소 요약 (전세권 설정 판단에 활용)
    const registrySummary = {
      hasSeizure: parsed.summary.hasSeizure,
      hasProvisionalSeizure: parsed.summary.hasProvisionalSeizure,
      hasProvisionalDisposition: parsed.summary.hasProvisionalDisposition,
      hasAuctionOrder: parsed.summary.hasAuctionOrder,
      hasTrust: parsed.summary.hasTrust,
      activeGapguEntries: parsed.summary.activeGapguEntries,
      activeEulguEntries: parsed.summary.activeEulguEntries,
      ownershipTransferCount: parsed.summary.ownershipTransferCount,
      totalJeonseAmount: parsed.summary.totalJeonseAmount ?? 0,
    };

    const propUid = parsed.title.propUid ?? "";
    return NextResponse.json({
      address,
      ownerName,
      totalMortgage,
      mortgageActiveCount,
      mortgageCancelledCount,
      ocrUsed,
      registrySummary,
      propUid,
    });
  } catch {
    return NextResponse.json({ error: "등기부등본 파싱 중 오류가 발생했습니다." }, { status: 500 });
  }
}
