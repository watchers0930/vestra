import { NextRequest, NextResponse } from "next/server";
import {
  fetchRealTransactions,
  fetchRecentPrices,
  extractLawdCode,
} from "@/lib/molit-api";

export async function GET(req: NextRequest) {
  try {
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
