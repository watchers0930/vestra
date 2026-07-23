import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { fetchOfficialPrices } from "@/lib/official-price-api";
import { checkGuaranteeInsurance } from "@/lib/guarantee-insurance";

// POST /api/listings/[id]/safety-check — 전세가율 + 보증보험 자동 계산
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true, ownerId: true, address: true, deposit: true,
        listingType: true, roomType: true, duration: true, availableFrom: true,
      },
    });

    if (!listing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (listing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const deposit = Number(listing.deposit);

    // 1. 공시가격 조회 (VWorld API)
    const priceResult = await fetchOfficialPrices(listing.address).catch(() => null);
    const officialPrice =
      priceResult?.aptPrice?.price ??
      priceResult?.housePrice?.price ??
      priceResult?.landPrice?.totalPrice ??
      null;

    // 2. 전세가율 계산 (전세만 해당)
    let jeonseRatio: number | null = null;
    if (listing.listingType === "JEONSE" && officialPrice && officialPrice > 0) {
      jeonseRatio = Math.round((deposit / officialPrice) * 1000) / 10; // 소수점 1자리
    }

    // 3. 보증보험 가입 가능 여부 (전세만)
    let insurance: { hugEligible: boolean; sgiEligible: boolean; hfEligible: boolean } | null = null;
    if (listing.listingType === "JEONSE" && officialPrice) {
      const today = new Date();
      const durationMonths = listing.duration ?? 24;
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      const result = checkGuaranteeInsurance({
        deposit,
        propertyPrice: officialPrice,
        seniorLiens: 0,
        propertyType: listing.roomType ?? "아파트",
        isMetro: /서울|부산|인천|대구|광주|대전|울산|세종/.test(listing.address),
        contractStartDate: today.toISOString().slice(0, 10),
        contractEndDate: endDate.toISOString().slice(0, 10),
        hasJeonseLoan: false,
      });

      insurance = {
        hugEligible: result.results.find((r) => r.provider === "HUG")?.status === "eligible",
        sgiEligible: result.results.find((r) => r.provider === "SGI")?.status === "eligible",
        hfEligible:  result.results.find((r) => r.provider === "HF")?.status === "eligible",
      };
    }

    // 4. 결과 저장
    await prisma.listing.update({
      where: { id },
      data: {
        ...(officialPrice != null ? { officialPrice: BigInt(Math.round(officialPrice)) } : {}),
        ...(jeonseRatio != null ? { jeonseRatio } : {}),
      },
    });

    return NextResponse.json({
      officialPrice,
      jeonseRatio,
      insurance,
      listingType: listing.listingType,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
