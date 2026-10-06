/**
 * 공개 임베드 시세 API (무인증)
 * ─────────────────────────────────────────────
 * 외부 사이트(임베드 위젯)에서 주소로 시세를 조회한다.
 * - GET만 지원, CORS 허용, IP rate limit으로 비용 보호
 * - OpenAI 호출 없음(통계만) → 저비용. MOLIT 실거래 기반.
 * - 응답은 위젯 표시에 필요한 최소 필드만 반환.
 */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit/comprehensive";
import { estimatePrice } from "@/lib/price-estimation";
import { toResidentialType } from "@/lib/molit/types";
import type { RealTransaction } from "@/lib/molit/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** 기간 전반부 평균 대비 후반부 평균으로 시세 추이(%) 산출 */
function calcTrend(txs: RealTransaction[]): { pct: number; up: boolean } | null {
  if (txs.length < 6) return null;
  const sorted = [...txs].sort(
    (a, b) =>
      a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay -
      (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
  );
  const half = Math.floor(sorted.length / 2);
  const avg = (arr: RealTransaction[]) =>
    arr.reduce((s, t) => s + t.dealAmount, 0) / arr.length;
  const older = avg(sorted.slice(0, half));
  const recent = avg(sorted.slice(half));
  if (older <= 0) return null;
  const pct = Math.round(((recent - older) / older) * 1000) / 10;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

/** 전용면적(㎡)당 평균 거래가 */
function calcPerArea(txs: RealTransaction[]): number | null {
  const withArea = txs.filter((t) => t.area > 0);
  if (!withArea.length) return null;
  return Math.round(
    withArea.reduce((s, t) => s + t.dealAmount / t.area, 0) / withArea.length
  );
}

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await rateLimit(`embed-price:${ip}`, 20, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { ...CORS, ...rateLimitHeaders(rl) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const address = sanitizeField(searchParams.get("address") || "", 200);
    const type = toResidentialType(sanitizeField(searchParams.get("type") || "", 20));

    if (!address || address.length < 3) {
      return NextResponse.json(
        { error: "주소를 3자 이상 입력해주세요." },
        { status: 400, headers: CORS }
      );
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

    return NextResponse.json(
      {
        address,
        period: sale.period,
        estimatedPrice,
        confidence: est.confidence,
        method: est.method,
        avgPrice: sale.avgPrice,
        minPrice: sale.minPrice,
        maxPrice: sale.maxPrice,
        transactionCount: sale.transactionCount,
        trend: calcTrend(sale.transactions),
        perArea: calcPerArea(sale.transactions),
        jeonseRatio: comp.jeonseRatio,
        lastUpdated: new Date().toISOString(),
      },
      { headers: { ...CORS, ...rateLimitHeaders(rl) } }
    );
  } catch {
    return NextResponse.json(
      { error: "시세 조회 중 오류가 발생했습니다." },
      { status: 500, headers: CORS }
    );
  }
}
