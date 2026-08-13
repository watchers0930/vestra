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
    if (!region || !apt) {
      return NextResponse.json({ kapt: null, official: null });
    }
    const address = `서울 ${region} ${dong}`.trim();

    const [kapt, official] = await Promise.all([
      fetchKaptInfoByAddress(`${region} ${dong} ${apt}`, apt).catch(() => null),
      fetchOfficialPrices(`${address} ${apt}`).catch(() => null),
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
