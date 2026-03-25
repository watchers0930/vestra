import { NextResponse } from "next/server";
import { fetchFSSLoanRates } from "@/lib/fss-loan-api";

/**
 * 전세대출 금리 자동 갱신 (Vercel Cron)
 * ──────────────────────────────────────
 * 매월 1, 11, 21일 09:00 KST 실행 (~10일 간격)
 * FSS 금융상품 통합비교공시 API에서 5대 은행 전세대출 금리 수집
 */

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await fetchFSSLoanRates();

  console.log(
    `[LOAN-RATE] 금리 업데이트 ${result.dataSource === "fss" ? "완료" : "실패(폴백)"}: ${result.products.length}개 상품. LTV/DTI 등 조건은 분기별 수동 확인 필요.`
  );

  return NextResponse.json({
    success: result.dataSource === "fss",
    productCount: result.products.length,
    fetchedAt: result.fetchedAt,
    dataSource: result.dataSource,
  });
}
