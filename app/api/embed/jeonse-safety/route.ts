/**
 * 공개 임베드 전세 안전진단 API (무인증)
 * 주소 + 전세보증금 → 전세가율·깡통전세 위험 (국토부 실거래 기반, OpenAI 미사용)
 */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit/comprehensive";
import { estimatePrice } from "@/lib/price-estimation";
import { toResidentialType } from "@/lib/molit/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await rateLimit(`embed-jeonse:${ip}`, 20, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { ...CORS, ...rateLimitHeaders(rl) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const address = sanitizeField(searchParams.get("address") || "", 200);
    const depositMan = parseInt(searchParams.get("deposit") || "", 10); // 만원 단위
    const type = toResidentialType(sanitizeField(searchParams.get("type") || "", 20));

    if (!address || address.length < 3) {
      return NextResponse.json({ error: "주소를 3자 이상 입력해주세요." }, { status: 400, headers: CORS });
    }
    if (!Number.isFinite(depositMan) || depositMan <= 0) {
      return NextResponse.json({ error: "전세보증금(만원)을 입력해주세요." }, { status: 400, headers: CORS });
    }

    const comp = await fetchComprehensivePrices(address, 12, type);
    const sale = comp.sale;
    if (!sale || sale.transactionCount === 0) {
      return NextResponse.json(
        { error: "해당 주소의 최근 실거래 데이터를 찾지 못했습니다.", address },
        { status: 404, headers: CORS }
      );
    }

    const est = await estimatePrice({ address }, sale, comp.rent);
    const estimatedPrice = est.estimatedPrice > 0 ? est.estimatedPrice : sale.avgPrice;
    const deposit = depositMan * 10000;
    const jeonseRatio = Math.round((deposit / estimatedPrice) * 1000) / 10;

    let level: "lo" | "md" | "hi", label: string;
    if (jeonseRatio >= 90) { level = "hi"; label = "위험 — 깡통전세 가능"; }
    else if (jeonseRatio >= 80) { level = "hi"; label = "주의 — 전세가율 높음"; }
    else if (jeonseRatio >= 70) { level = "md"; label = "경계 — 전세가율 다소 높음"; }
    else { level = "lo"; label = "양호"; }

    const note =
      jeonseRatio >= 80
        ? "전세가율이 높아 전세금 미반환(깡통전세) 위험이 있습니다. 선순위 채권·등기부 확인을 권장합니다."
        : jeonseRatio >= 70
          ? "전세가율이 다소 높습니다. 계약 전 등기부상 선순위 채권을 확인하세요."
          : null;

    return NextResponse.json(
      {
        address,
        estimatedPrice,
        deposit,
        jeonseRatio,
        marketJeonseRatio: comp.jeonseRatio,
        avgDeposit: comp.rent?.avgDeposit ?? null,
        saleTransactionCount: sale.transactionCount,
        risk: { level, label },
        note,
        lastUpdated: new Date().toISOString(),
      },
      { headers: { ...CORS, ...rateLimitHeaders(rl) } }
    );
  } catch {
    return NextResponse.json({ error: "전세 진단 중 오류가 발생했습니다." }, { status: 500, headers: CORS });
  }
}
