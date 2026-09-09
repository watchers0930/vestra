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
    if (!isPDF) {
      return NextResponse.json({ error: "PDF 파일만 지원합니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await extractTextFromPDF(buffer, file.name ?? "registry.pdf");

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "텍스트를 추출할 수 없습니다. PDF 형식을 확인해 주세요." }, { status: 422 });
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
    return NextResponse.json({ address, ownerName, totalMortgage, registrySummary, propUid });
  } catch {
    return NextResponse.json({ error: "등기부등본 파싱 중 오류가 발생했습니다." }, { status: 500 });
  }
}
