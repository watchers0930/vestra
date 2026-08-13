import { NextRequest, NextResponse } from "next/server";
import { fetchKaptInfoByAddress } from "@/lib/kapt-api";
import { fetchOfficialPrices } from "@/lib/official-price-api";

// GET /api/listings/apt-info — 단지(K-apt) + 공시가격 기본정보 (공개)
//   query: region(시군구), dong(법정동), apt(아파트명)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = (searchParams.get("region") || "").trim();
    const dong = (searchParams.get("dong") || "").trim();
    const apt = (searchParams.get("apt") || "").trim();
    const latP = searchParams.get("lat");
    const lngP = searchParams.get("lng");
    const coord = latP && lngP ? { lat: Number(latP), lng: Number(lngP) } : undefined;
    if (!region || !apt) {
      return NextResponse.json({ kapt: null, official: null });
    }

    const [kapt, official] = await Promise.all([
      // KAPT: 시군구 추출용 주소 + 단지명 힌트
      fetchKaptInfoByAddress(`${region} ${dong} ${apt}`, apt).catch(() => null),
      // 공시가격: 주소(동) + 좌표 폴백 (지번 없어도 좌표로 PNU 확보)
      fetchOfficialPrices(`${region} ${dong}`, undefined, coord).catch(() => null),
    ]);

    return NextResponse.json({
      kapt: kapt
        ? {
            households: kapt.households ?? null,
            dongCount: kapt.dongCount ?? null,
            approvalDate: kapt.approvalDate ?? null,
            heatingType: kapt.heatingType ?? null,
            corridorType: kapt.corridorType ?? null,
            parkingTotal: kapt.parkingTotal ?? null,
            constructorName: kapt.constructorName ?? null,
          }
        : null,
      official: official?.aptPrice
        ? { price: official.aptPrice.price ?? null, year: official.aptPrice.year ?? null }
        : null,
    });
  } catch (e) {
    console.error("[/api/listings/apt-info] 오류:", e instanceof Error ? e.message : e);
    return NextResponse.json({ kapt: null, official: null });
  }
}
