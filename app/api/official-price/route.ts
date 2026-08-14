/**
 * 공시가격 조회 API
 * GET /api/official-price?address=서울 강남구 역삼동 123-4&year=2025
 * GET /api/official-price?address=강남구 세곡동&lat=37.47&lng=127.05  (좌표 폴백)
 *
 * 주소 → Kakao 지오코딩(법정동코드) → PNU 생성 → 3가지 공시가격 API 병렬 호출
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialPrices } from "@/lib/official-price-api";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  const yearParam = req.nextUrl.searchParams.get("year");
  const latParam = req.nextUrl.searchParams.get("lat");
  const lngParam = req.nextUrl.searchParams.get("lng");
  const dongParam = req.nextUrl.searchParams.get("dong")?.trim() ?? "";
  const hoParam = req.nextUrl.searchParams.get("ho")?.trim() ?? "";

  if (address.length < 3) {
    return NextResponse.json(
      { error: "주소를 입력해주세요 (최소 3자)" },
      { status: 400 },
    );
  }

  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  if (yearParam && (isNaN(year!) || year! < 2006 || year! > new Date().getFullYear())) {
    return NextResponse.json(
      { error: "유효하지 않은 연도입니다" },
      { status: 400 },
    );
  }

  const coord = latParam && lngParam
    ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) }
    : undefined;

  // 동/호 파라미터(숫자만 허용) → 특정 세대 공시가 조회
  const dong = /^\d+$/.test(dongParam) ? dongParam : "";
  const ho = /^\d+$/.test(hoParam) ? hoParam : "";
  const unit = dong || ho ? { dong, ho } : undefined;

  try {
    const result = await fetchOfficialPrices(address, year, coord, unit);

    if (!result) {
      return NextResponse.json(
        { error: "해당 주소의 공시가격을 찾을 수 없습니다. 정확한 지번 주소를 입력해주세요." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "공시가격 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
