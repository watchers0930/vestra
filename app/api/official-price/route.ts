/**
 * 공시가격 조회 API
 * GET /api/official-price?address=서울 강남구 역삼동 123-4&year=2025
 *
 * 주소 → Kakao 지오코딩(법정동코드) → PNU 생성 → 3가지 공시가격 API 병렬 호출
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialPrices } from "@/lib/official-price-api";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  const yearParam = req.nextUrl.searchParams.get("year");

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

  try {
    const result = await fetchOfficialPrices(address, year);

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
