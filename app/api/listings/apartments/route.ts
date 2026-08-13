import { NextRequest, NextResponse } from "next/server";
import { LAWD_CODE_MAP } from "@/lib/molit/molit-data";
import { fetchRealTransactions } from "@/lib/molit-api";

// GET /api/listings/apartments — 국토교통부 아파트 매매 실거래 (지역별 최근)
//   공개 조회 (인증 불필요). 활성 매물 API가 공공에 없어 실거래가 기록을 매물 카드로 노출.
//   query: region(시군구명, 기본 강남구), months(조회 개월수, 기본 6), limit(기본 30)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = (searchParams.get("region") || "강남구").trim();
    const months = Math.min(12, Math.max(1, Number(searchParams.get("months") ?? "6")));
    const limit = Math.min(60, Math.max(1, Number(searchParams.get("limit") ?? "30")));

    const lawdCd = LAWD_CODE_MAP[region] ?? LAWD_CODE_MAP["강남구"];

    // 서버 현재 시각 기준 최근 N개월의 계약년월 목록
    const now = new Date();
    const ymds = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const results = await Promise.all(ymds.map((ymd) => fetchRealTransactions(lawdCd, ymd)));
    const all = results.flat();

    all.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay),
    );

    const items = all.slice(0, limit).map((t, i) => ({
      id: `molit-${lawdCd}-${t.dealYear}${t.dealMonth}${t.dealDay}-${i}`,
      aptName: t.aptName,
      dong: t.dong,
      jibun: t.jibun ?? null,
      area: t.area,
      floor: t.floor,
      buildYear: t.buildYear,
      dealAmount: t.dealAmount,
      dealDate: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}.${String(t.dealDay).padStart(2, "0")}`,
    }));

    return NextResponse.json({ region, lawdCd, total: items.length, items });
  } catch (e) {
    console.error("[/api/listings/apartments] 오류:", e instanceof Error ? e.message : e);
    return NextResponse.json({ region: null, total: 0, items: [] });
  }
}
