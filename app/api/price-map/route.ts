/**
 * 시세 지도 API — 특정 구의 아파트별 실거래가 + 좌표 반환
 * 리치고 스타일 지도 마커용 데이터 제공
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// 서울 주요 아파트 시세 데이터 (실 데이터 연동 전 시드)
// TODO: MOLIT API + 카카오 Geocoding으로 실시간 데이터 교체
const SEED_DATA: Record<string, AptPrice[]> = {
  "강남구": [
    { name: "압구정동 현대", dong: "압구정동", price: 728000, area: 36, lat: 37.5270, lng: 127.0280, change: 2.1, year: 1976 },
    { name: "대치동 은마", dong: "대치동", price: 298000, area: 31, lat: 37.4945, lng: 127.0572, change: -0.5, year: 1979 },
    { name: "개포동 주공1단지", dong: "개포동", price: 385000, area: 33, lat: 37.4835, lng: 127.0460, change: 1.8, year: 1982 },
    { name: "도곡동 타워팰리스", dong: "도곡동", price: 520000, area: 59, lat: 37.4930, lng: 127.0390, change: 0.3, year: 2002 },
    { name: "삼성동 아이파크", dong: "삼성동", price: 680000, area: 55, lat: 37.5110, lng: 127.0600, change: 1.5, year: 2004 },
    { name: "청담동 래미안", dong: "청담동", price: 450000, area: 34, lat: 37.5190, lng: 127.0510, change: 0.8, year: 2010 },
    { name: "역삼동 래미안", dong: "역삼동", price: 285000, area: 25, lat: 37.5000, lng: 127.0360, change: -0.2, year: 2008 },
    { name: "논현동 SK", dong: "논현동", price: 320000, area: 30, lat: 37.5130, lng: 127.0310, change: 1.2, year: 2005 },
    { name: "신사동 대장", dong: "신사동", price: 298000, area: 32, lat: 37.5230, lng: 127.0240, change: 0.6, year: 1990 },
    { name: "일원동 삼성래미안", dong: "일원동", price: 225000, area: 34, lat: 37.4860, lng: 127.0830, change: 2.5, year: 2009 },
  ],
  "서초구": [
    { name: "반포동 아크로리버파크", dong: "반포동", price: 580000, area: 40, lat: 37.5070, lng: 127.0040, change: 1.9, year: 2016 },
    { name: "잠원동 래미안", dong: "잠원동", price: 320000, area: 33, lat: 37.5135, lng: 127.0080, change: 0.7, year: 2009 },
    { name: "서초동 삼풍", dong: "서초동", price: 275000, area: 32, lat: 37.4930, lng: 127.0090, change: -0.3, year: 1988 },
    { name: "방배동 래미안", dong: "방배동", price: 198000, area: 25, lat: 37.4810, lng: 126.9960, change: 1.1, year: 2006 },
    { name: "양재동 래미안", dong: "양재동", price: 185000, area: 33, lat: 37.4750, lng: 127.0350, change: 0.5, year: 2003 },
  ],
  "송파구": [
    { name: "잠실동 엘스", dong: "잠실동", price: 295000, area: 33, lat: 37.5100, lng: 127.0830, change: 1.3, year: 2008 },
    { name: "잠실동 리센츠", dong: "잠실동", price: 285000, area: 33, lat: 37.5110, lng: 127.0860, change: 1.1, year: 2008 },
    { name: "잠실동 트리지움", dong: "잠실동", price: 265000, area: 33, lat: 37.5080, lng: 127.0800, change: 0.9, year: 2008 },
    { name: "가락동 헬리오시티", dong: "가락동", price: 235000, area: 34, lat: 37.4960, lng: 127.1180, change: 2.0, year: 2018 },
    { name: "문정동 래미안", dong: "문정동", price: 175000, area: 25, lat: 37.4850, lng: 127.1230, change: 0.4, year: 2010 },
    { name: "방이동 올림픽선수기자촌", dong: "방이동", price: 265000, area: 34, lat: 37.5175, lng: 127.1130, change: 1.7, year: 1988 },
  ],
  "마포구": [
    { name: "아현동 마포래미안푸르지오", dong: "아현동", price: 185000, area: 34, lat: 37.5510, lng: 126.9560, change: 1.5, year: 2014 },
    { name: "공덕동 래미안", dong: "공덕동", price: 168000, area: 25, lat: 37.5440, lng: 126.9510, change: 0.8, year: 2012 },
    { name: "상암동 DMC", dong: "상암동", price: 125000, area: 33, lat: 37.5780, lng: 126.8900, change: -0.5, year: 2010 },
    { name: "용강동 래미안", dong: "용강동", price: 152000, area: 24, lat: 37.5380, lng: 126.9420, change: 1.0, year: 2017 },
  ],
  "용산구": [
    { name: "한남동 한남더힐", dong: "한남동", price: 720000, area: 59, lat: 37.5340, lng: 127.0010, change: 0.5, year: 2011 },
    { name: "이촌동 래미안", dong: "이촌동", price: 310000, area: 34, lat: 37.5200, lng: 126.9700, change: 1.8, year: 2018 },
    { name: "원효로 시티파크", dong: "원효로", price: 165000, area: 25, lat: 37.5350, lng: 126.9630, change: 0.9, year: 2006 },
  ],
};

interface AptPrice {
  name: string;
  dong: string;
  price: number;      // 만원 단위
  area: number;        // 평
  lat: number;
  lng: number;
  change: number;      // 1개월 증감률 (%)
  year: number;        // 건축년도
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = await rateLimit(`price-map:${ip}`, 30);
  if (!rl.success) {
    return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const { searchParams } = req.nextUrl;
  const gu = searchParams.get("gu") || "강남구";
  const minPrice = parseInt(searchParams.get("minPrice") || "0");
  const maxPrice = parseInt(searchParams.get("maxPrice") || "9999999");
  const tradeType = searchParams.get("type") || "매매"; // 매매 | 전세

  let data = SEED_DATA[gu] || [];

  // 가격 필터
  if (minPrice > 0 || maxPrice < 9999999) {
    data = data.filter(d => d.price >= minPrice && d.price <= maxPrice);
  }

  // 구 목록
  const availableGus = Object.keys(SEED_DATA);

  return NextResponse.json({
    gu,
    tradeType,
    apartments: data,
    center: data.length > 0
      ? { lat: data.reduce((s, d) => s + d.lat, 0) / data.length, lng: data.reduce((s, d) => s + d.lng, 0) / data.length }
      : { lat: 37.4979, lng: 127.0276 },
    availableGus,
    total: data.length,
  });
}
