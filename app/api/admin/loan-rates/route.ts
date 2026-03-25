import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchFSSLoanRates, getCachedRates } from "@/lib/fss-loan-api";

/**
 * 관리자 대출 금리 관리 API
 * GET  — 현재 캐시된 금리 데이터 반환
 * POST — FSS 금리 수동 갱신 트리거
 */

async function checkAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const cached = await getCachedRates();
  return NextResponse.json({
    rates: cached,
    hasCachedData: !!cached,
  });
}

export async function POST() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const result = await fetchFSSLoanRates();
  return NextResponse.json({
    success: result.dataSource === "fss",
    productCount: result.products.length,
    fetchedAt: result.fetchedAt,
    products: result.products,
  });
}
