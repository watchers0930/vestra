/**
 * 공개 임베드 취득세 계산 API (무인증)
 * 매매가 + 주택수 + 조정지역 + 생애최초 → 취득세 (순수 계산, OpenAI·외부API 미사용)
 */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { calculateAcquisitionTax } from "@/lib/tax-calculator";

export const runtime = "nodejs";
export const maxDuration = 15;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function truthy(v: string | null): boolean {
  return v === "true" || v === "1" || v === "y";
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await rateLimit(`embed-tax:${ip}`, 40, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { ...CORS, ...rateLimitHeaders(rl) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const priceMan = parseInt(searchParams.get("price") || "", 10); // 만원 단위
    const houseCount = Math.min(Math.max(parseInt(searchParams.get("houseCount") || "1", 10) || 1, 1), 4);
    const isAdjusted = truthy(searchParams.get("adjusted"));
    const isFirstHome = truthy(searchParams.get("firstHome"));

    if (!Number.isFinite(priceMan) || priceMan <= 0) {
      return NextResponse.json({ error: "매매가(만원)를 입력해주세요." }, { status: 400, headers: CORS });
    }

    const price = priceMan * 10000;
    const r = calculateAcquisitionTax({ price, houseCount, isAdjusted, isFirstHome });

    return NextResponse.json(
      {
        price,
        houseCount,
        isAdjusted,
        isFirstHome,
        tax: r.tax,
        localEduTax: r.localEduTax,
        specialTax: r.specialTax,
        totalTax: r.totalTax,
        rate: r.rate,
        label: r.label,
        details: r.details,
        lastUpdated: new Date().toISOString(),
      },
      { headers: { ...CORS, ...rateLimitHeaders(rl) } }
    );
  } catch {
    return NextResponse.json({ error: "세금 계산 중 오류가 발생했습니다." }, { status: 500, headers: CORS });
  }
}
