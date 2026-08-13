import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";

const safetyDocSchema = z.object({
  type: z.enum(["건축물대장", "전입세대열람"]),
  url: z.string().url(),
  filename: z.string().max(200),
});

const createListingSchema = z.object({
  listingType: z.enum(["JEONSE", "SALE"]),
  address: z.string().min(5, "주소를 입력해주세요."),
  roomType: z.string().optional().nullable(),
  size: z.number().positive().optional().nullable(),
  floor: z.number().int().optional().nullable(),
  totalFloor: z.number().int().optional().nullable(),
  deposit: z.number().int().positive("보증금/매매가를 입력해주세요."),
  managementFee: z.number().int().min(0).optional().nullable(),
  duration: z.number().int().min(1).max(60).optional().nullable(),
  availableFrom: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  analysisId: z.string().optional().nullable(),
  photos: z.array(z.string().url()).max(10).optional().nullable(),
  safetyDocuments: z.array(safetyDocSchema).max(5).optional().nullable(),
});

// GET /api/listings — 매물 목록
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingType = searchParams.get("listingType"); // JEONSE | SALE
    const roomType   = searchParams.get("roomType");
    const region     = searchParams.get("region");
    const minSize    = searchParams.get("minSize");
    const maxSize    = searchParams.get("maxSize");
    const mine = searchParams.get("mine") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "12"));

    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (listingType === "JEONSE" || listingType === "SALE") {
      where.listingType = listingType;
    }
    if (roomType) where.roomType = { contains: roomType };
    if (region)   where.address  = { contains: region };
    if (minSize || maxSize) {
      const sizeFilter: Record<string, number> = {};
      if (minSize) sizeFilter.gte = Number(minSize);
      if (maxSize) sizeFilter.lte = Number(maxSize);
      where.size = sizeFilter;
    }

    if (mine) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
      }
      where.ownerId = session.user.id;
      delete where.status;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          listingType: true,
          address: true,
          roomType: true,
          size: true,
          floor: true,
          totalFloor: true,
          deposit: true,
          managementFee: true,
          duration: true,
          availableFrom: true,
          photos: true,
          description: true,
          safetyDocuments: true,
          officialPrice: true,
          jeonseRatio: true,
          isCertified: true,
          certifiedAt: true,
          taxDocUrl: true,
          taxDocFilename: true,
          buildingDocUrl: true,
          insuranceResult: true,
          status: true,
          viewCount: true,
          analysisId: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          owner: { select: { id: true, name: true, role: true, companyName: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({ listings: listings.map(serialize), total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/listings — 매물 등록
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const { deposit, managementFee, availableFrom, safetyDocuments, photos, ...rest } = parsed.data;

    const listing = await prisma.listing.create({
      data: {
        ...rest,
        ownerId: session.user.id,
        deposit: BigInt(deposit),
        managementFee: managementFee != null ? BigInt(managementFee) : null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        photos: photos ?? undefined,
        safetyDocuments: safetyDocuments ?? undefined,
      },
      select: { id: true, status: true, createdAt: true },
    });

    // 주소 → 좌표 geocoding (fire-and-forget, 축약 폴백 포함)
    const kakaoRestKey = process.env.KAKAO_REST_KEY;
    if (kakaoRestKey && parsed.data.address) {
      const tryGeocode = async (query: string) => {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`,
          { headers: { Authorization: `KakaoAK ${kakaoRestKey}` } }
        );
        const json = await res.json();
        return json.documents?.[0] ?? null;
      };
      (async () => {
        try {
          const addr = parsed.data.address;
          // 1차: 전체 주소
          let doc = await tryGeocode(addr);
          // 2차: 마지막 토큰(건물명 등) 제거
          if (!doc) doc = await tryGeocode(addr.replace(/\s+\S+$/, ""));
          // 3차: 번지 제거 후 동이름까지만
          if (!doc) {
            const dongOnly = addr.match(/(.*?[가-힣]+동)/)?.[1];
            if (dongOnly) doc = await tryGeocode(dongOnly);
          }
          if (doc) {
            await prisma.listing.update({
              where: { id: listing.id },
              data: { latitude: parseFloat(doc.y), longitude: parseFloat(doc.x) },
            });
          }
        } catch { /* geocoding 실패는 무시 */ }
      })();
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

function serialize(l: Record<string, unknown>) {
  return {
    ...l,
    deposit: (l.deposit as bigint)?.toString() ?? null,
    managementFee: (l.managementFee as bigint | null)?.toString() ?? null,
    officialPrice: (l.officialPrice as bigint | null)?.toString() ?? null,
  };
}
