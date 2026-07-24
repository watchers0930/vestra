import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";

// POST /api/listings/[id]/certify — 안전인증 자동조회 실행
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
      select: { ownerId: true, address: true, taxDocUrl: true, isCertified: true },
    });
    if (!listing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (listing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const result = {
      registry: false,
      building: false,
      taxDoc: !!listing.taxDocUrl,
      registryText: null as string | null,
      buildingDocUrl: null as string | null,
      error: null as string | null,
    };

    // 1. 틸코 등기부등본 자동조회
    if (isTilkoRegistryDocAvailable()) {
      try {
        const reg = await fetchRegistryDocumentByAddress({ address: listing.address });
        if (reg.text && reg.text.length > 50) {
          result.registry = true;
          result.registryText = reg.text;
        }
      } catch (e) {
        console.error("[certify] 틸코 조회 실패:", e);
      }
    } else {
      result.error = "등기부 조회 서비스 미설정";
    }

    // 2. 건축물대장 자동조회 (KAPT)
    try {
      const building = await fetchBuildingInfoByAddress(listing.address);
      if (building) {
        result.building = true;
        result.buildingDocUrl = `https://www.gov.kr/search?query=${encodeURIComponent(listing.address)}`;
      }
    } catch (e) {
      console.error("[certify] 건축물대장 조회 실패:", e);
    }

    // 3종 모두 확인 시 인증
    const isCertified = result.registry && result.building && result.taxDoc;

    await prisma.listing.update({
      where: { id },
      data: {
        registryText: result.registryText ?? undefined,
        buildingDocUrl: result.buildingDocUrl ?? undefined,
        isCertified,
        certifiedAt: isCertified ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      isCertified,
      checks: {
        registry: result.registry,
        building: result.building,
        taxDoc: result.taxDoc,
      },
      error: result.error,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
