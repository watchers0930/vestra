import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentRentPrices, fetchRecentPrices } from "@/lib/molit-api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { address: true, deposit: true, listingType: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }

    // 전월세 데이터 우선 시도, 없으면 매매 데이터로 폴백
    const rentResult = await fetchRecentRentPrices(listing.address, 6);
    const hasRent = rentResult && rentResult.transactions.length > 0;

    if (hasRent) {
      // ── 전월세 데이터 ─────────────────────────────────────────
      const byMonth: Record<string, { deposits: number[]; wolses: number[] }> = {};
      rentResult!.transactions.forEach((t) => {
        const key = `${t.dealYear}-${String(t.dealMonth).padStart(2, "0")}`;
        if (!byMonth[key]) byMonth[key] = { deposits: [], wolses: [] };
        byMonth[key].deposits.push(t.deposit);
        if (t.monthlyRent > 0) byMonth[key].wolses.push(t.monthlyRent);
      });

      const monthly = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { deposits, wolses }]) => ({
          month,
          avgDeposit: deposits.length > 0
            ? Math.round(deposits.reduce((s, v) => s + v, 0) / deposits.length / 10000)
            : 0,
          avgWolse: wolses.length > 0
            ? Math.round(wolses.reduce((s, v) => s + v, 0) / wolses.length / 10000)
            : 0,
          count: deposits.length,
        }));

      return NextResponse.json({
        avgDeposit: Math.round(rentResult!.avgDeposit / 10000),
        monthly,
        period: rentResult!.period,
        listingDeposit: Math.round(Number(listing.deposit) / 10000),
        listingType: listing.listingType,
        barLabel: "평균보증금",
      });
    }

    // ── 매매 데이터 폴백 ─────────────────────────────────────────
    const saleResult = await fetchRecentPrices(listing.address, 6);
    if (!saleResult || saleResult.transactions.length === 0) {
      return NextResponse.json({ error: "조회 가능한 시세 데이터가 없습니다." }, { status: 404 });
    }

    const bySaleMonth: Record<string, number[]> = {};
    saleResult.transactions.forEach((t) => {
      const key = `${t.dealYear}-${String(t.dealMonth).padStart(2, "0")}`;
      if (!bySaleMonth[key]) bySaleMonth[key] = [];
      bySaleMonth[key].push(t.dealAmount);
    });

    const monthly = Object.entries(bySaleMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, prices]) => ({
        month,
        avgDeposit: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length / 10000),
        avgWolse: 0,
        count: prices.length,
      }));

    return NextResponse.json({
      avgDeposit: Math.round(saleResult.avgPrice / 10000),
      monthly,
      period: saleResult.period,
      listingDeposit: Math.round(Number(listing.deposit) / 10000),
      listingType: listing.listingType,
      barLabel: "평균거래가",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
