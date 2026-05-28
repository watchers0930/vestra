/**
 * 주소 자동완성 프록시 API
 * GET /api/address-search?q=검색어
 * - 카카오 주소 검색 API 프록시 (KAKAO_REST_KEY 노출 방지)
 * - 최대 5건 반환
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!kakaoKey) {
    return NextResponse.json(
      { error: "서버 설정 오류" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "주소 검색에 실패했습니다" },
        { status: 502 },
      );
    }

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (json.documents ?? []).map((doc: any) => {
      const ra = doc.road_address;
      return {
        address: doc.address?.address_name ?? "",
        roadAddress: ra?.address_name ?? "",
        buildingName: ra?.building_name || "",
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "주소 검색 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
