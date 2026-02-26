import { NextRequest, NextResponse } from "next/server";
import {
  fetchRealTransactions,
  fetchRecentPrices,
} from "@/lib/molit-api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (공개 API: 10 req/min)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`real-price:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const lawdCd = searchParams.get("lawdCd");
    const dealYmd = searchParams.get("dealYmd");

    // 주소 기반 최근 시세 조회
    if (address) {
      const result = await fetchRecentPrices(address);
      if (!result) {
        return NextResponse.json(
          { error: "해당 주소의 법정동 코드를 찾을 수 없습니다." },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    }

    // 법정동 코드 + 계약년월 직접 조회
    if (lawdCd && dealYmd) {
      const transactions = await fetchRealTransactions(lawdCd, dealYmd);
      return NextResponse.json({
        transactions,
        count: transactions.length,
        lawdCd,
        dealYmd,
      });
    }

    return NextResponse.json(
      { error: "address 또는 lawdCd+dealYmd 파라미터가 필요합니다." },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Real price API error:", message);
    return NextResponse.json(
      { error: `실거래가 조회 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
