/**
 * 관할 주민센터 조회 API
 * GET /api/community-center?address=검색어
 * - 카카오 지오코딩(주소 → 좌표·행정동) → 키워드 검색(주민센터/행정복지센터)
 * - KAKAO_REST_KEY 서버 보관 (클라이언트 노출 방지)
 */

import { NextRequest, NextResponse } from "next/server";

interface Center {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  placeUrl: string;
}

// 이름이 "○○동주민센터/행정복지센터"로 끝나는 것만 (뒤 "(...)" 부가설명 허용)
const CENTER_RE = /(주민센터|행정복지센터|동사무소|주민자치센터|면사무소|읍사무소)(\s*\(.+\))?$/;
// 부속시설(무인민원기·충전소 등) 제외 — 실제 관할 청사만
const EXCLUDE_RE = /(무인민원|민원발급|개방화장실|마을건강|건강센터|임시청사|주차장|어린이집|도서관|경로당|보건지소|파출소|우체국|충전소|전기차|렌터카|카셰어)/;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (address.length < 2) {
    return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 });
  }

  const key = process.env.KAKAO_REST_KEY;
  if (!key) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  const headers = { Authorization: `KakaoAK ${key}` };

  try {
    // 1) 주소 → 좌표·행정동
    const geoRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`,
      { headers },
    );
    const geoJson = await geoRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = geoJson.documents?.[0];
    if (!doc) {
      return NextResponse.json({ error: "주소를 찾을 수 없습니다. 정확한 주소를 입력해 주세요." }, { status: 404 });
    }

    const lng = doc.x;
    const lat = doc.y;
    const region2 = doc.address?.region_2depth_name ?? doc.road_address?.region_2depth_name ?? "";
    const dong = doc.address?.region_3depth_h_name || doc.address?.region_3depth_name || doc.road_address?.region_3depth_name || "";

    // 2) 관할 주민센터 검색 (구·동 기준, 좌표 근접순)
    const query = `${region2} ${dong} 주민센터`.trim();
    const kwRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=5000&sort=distance&size=10`,
      { headers },
    );
    const kwJson = await kwRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docs: any[] = (kwJson.documents ?? []).filter((d: any) => CENTER_RE.test(d.place_name) && !EXCLUDE_RE.test(d.place_name));

    // fallback: 동명만으로 재검색
    if (docs.length === 0 && dong) {
      const fbRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${dong} 행정복지센터`)}&x=${lng}&y=${lat}&radius=5000&sort=distance&size=10`,
        { headers },
      );
      const fbJson = await fbRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      docs = (fbJson.documents ?? []).filter((d: any) => CENTER_RE.test(d.place_name) && !EXCLUDE_RE.test(d.place_name));
    }

    const centers: Center[] = docs.slice(0, 3).map((d) => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name || "",
      phone: d.phone || "",
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      placeUrl: d.place_url || "",
    }));

    if (centers.length === 0) {
      return NextResponse.json({ error: "인근 주민센터를 찾지 못했습니다." }, { status: 404 });
    }

    return NextResponse.json({ dong, origin: { lat: parseFloat(lat), lng: parseFloat(lng) }, centers });
  } catch {
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
