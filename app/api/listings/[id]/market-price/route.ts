import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentPrices } from "@/lib/molit-api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { address: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }

    const result = await fetchRecentPrices(listing.address, 6);
    if (!result) {
      return NextResponse.json({ error: "시세 데이터를 조회할 수 없습니다." }, { status: 404 });
    }

    // 월별 평균가 집계
    const byMonth: Record<string, number[]> = {};
    result.transactions.forEach((t) => {
      const key = `${t.dealYear}-${String(t.dealMonth).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(t.dealAmount);
    });
    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, prices]) => ({
        month,
        avg: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length),
        count: prices.length,
      }));

    return NextResponse.json({
      avgPrice: result.avgPrice,
      minPrice: result.minPrice,
      maxPrice: result.maxPrice,
      transactionCount: result.transactionCount,
      period: result.period,
      monthly,
      recent: result.transactions.slice(0, 5).map((t) => ({
        date: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}.${String(t.dealDay).padStart(2, "0")}`,
        price: t.dealAmount,
        area: t.area,
        floor: t.floor,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
