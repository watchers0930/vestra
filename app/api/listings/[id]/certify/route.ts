import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";
import { fetchOfficialPrices } from "@/lib/official-price-api";
import { checkGuaranteeInsurance } from "@/lib/guarantee-insurance";

// 등기부 텍스트에서 선순위 채권(근저당) 합계 파싱
function parseSeniorLiens(text: string): number {
  const matches = [...text.matchAll(/채권최고액\s*금?\s*([\d,]+)원/g)];
  return matches.reduce((sum, m) => sum + parseInt(m[1].replace(/,/g, ""), 10), 0);
}

// POST /api/listings/[id]/certify
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
        ownerId: true, address: true,
        taxDocUrl: true, deposit: true,
        listingType: true, roomType: true,
      },
    });
    if (!listing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (listing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const checks = { registry: false, building: false, taxDoc: !!listing.taxDocUrl };
    let registryText: string | null = null;
    let buildingDocUrl: string | null = null;
    let seniorLiens = 0;
    let officialPrice: number | null = null;
    let jeonseRatio: number | null = null;
    let insuranceResult: Record<string, unknown> | null = null;
    const errors: string[] = [];

    // 1. 틸코 등기부 자동조회 + 선순위 채권 파싱
    if (isTilkoRegistryDocAvailable()) {
      try {
        const reg = await fetchRegistryDocumentByAddress({ address: listing.address });
        if (reg.text && reg.text.length > 50) {
          checks.registry = true;
          registryText = reg.text;
          seniorLiens = parseSeniorLiens(reg.text);
        }
      } catch (e) {
        console.error("[certify] 틸코 조회 실패:", e);
        errors.push("등기부 조회 실패");
      }
    } else {
      errors.push("등기부 조회 서비스 미설정");
    }

    // 2. 건축물대장 자동조회
    try {
      const building = await fetchBuildingInfoByAddress(listing.address);
      if (building) {
        checks.building = true;
        buildingDocUrl = `https://www.gov.kr/search?query=${encodeURIComponent(listing.address)}`;
      }
    } catch (e) {
      console.error("[certify] 건축물대장 조회 실패:", e);
      errors.push("건축물대장 조회 실패");
    }

    // 3. VWorld 공시가격 + 전세가율 + 보증보험 (JEONSE만)
    if (listing.listingType === "JEONSE") {
      try {
        const priceResult = await fetchOfficialPrices(listing.address);
        if (priceResult) {
          const priceItem = priceResult.aptPrice ?? priceResult.housePrice ?? priceResult.landPrice ?? null;
          const price = priceItem?.price ?? null;
          if (price && price > 0) {
            officialPrice = price;
            const deposit = Number(listing.deposit);
            jeonseRatio = Math.round((deposit / price) * 1000) / 10;

            const today = new Date();
            const endDate = new Date(today);
            endDate.setFullYear(endDate.getFullYear() + 2);
            const insuranceCheck = checkGuaranteeInsurance({
              deposit,
              propertyPrice: price,
              seniorLiens,
              propertyType: listing.roomType ?? "아파트",
              isMetro: true,
              contractStartDate: today.toISOString().slice(0, 10),
              contractEndDate: endDate.toISOString().slice(0, 10),
              hasJeonseLoan: false,
            });
            insuranceResult = {
              hugEligible: insuranceCheck.results.find((r) => r.provider === "HUG")?.status === "eligible",
              sgiEligible: insuranceCheck.results.find((r) => r.provider === "SGI")?.status === "eligible",
              hfEligible: insuranceCheck.results.find((r) => r.provider === "HF")?.status === "eligible",
              recommendation: insuranceCheck.recommendation,
            };
          }
        }
      } catch (e) {
        console.error("[certify] 공시가격 조회 실패:", e);
      }
    }

    const isCertified = checks.registry && checks.building && checks.taxDoc;

    await prisma.listing.update({
      where: { id },
      data: {
        registryText: registryText ?? undefined,
        buildingDocUrl: buildingDocUrl ?? undefined,
        isCertified,
        certifiedAt: isCertified ? new Date() : undefined,
        seniorLiens: seniorLiens > 0 ? BigInt(seniorLiens) : undefined,
        officialPrice: officialPrice ? BigInt(Math.round(officialPrice)) : undefined,
        jeonseRatio: jeonseRatio ?? undefined,
        insuranceResult: insuranceResult ?? undefined,
      },
    });

    return NextResponse.json({
      isCertified,
      checks,
      jeonseRatio,
      officialPrice,
      insuranceResult,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
