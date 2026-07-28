import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { parseRegistry } from "@/lib/registry-parser";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
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
