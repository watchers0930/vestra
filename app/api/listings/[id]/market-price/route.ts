import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentRentPrices } from "@/lib/molit-api";

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

    const result = await fetchRecentRentPrices(listing.address, 6);
    if (!result || result.transactions.length === 0) {
      return NextResponse.json({ error: "시세 데이터를 조회할 수 없습니다." }, { status: 404 });
    }

    // 월별 집계
    const byMonth: Record<string, { deposits: number[]; wolses: number[] }> = {};
    result.transactions.forEach((t) => {
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
          ? Math.round(deposits.reduce((s, v) => s + v, 0) / deposits.length)
          : 0,
        avgWolse: wolses.length > 0
          ? Math.round(wolses.reduce((s, v) => s + v, 0) / wolses.length)
          : 0,
        count: deposits.length,
      }));

    return NextResponse.json({
      avgDeposit: result.avgDeposit,
      monthly,
      period: result.period,
      listingDeposit: Number(listing.deposit),
      listingType: listing.listingType,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
