/**
 * 시세 지도 API — 구/시별 아파트 실거래가 + 좌표 반환
 * 서울 25개 구 + 경기 주요 도시 지원
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

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

// ---------------------------------------------------------------------------
// 서울 25개 구 + 경기 주요 도시 시드 데이터
// ---------------------------------------------------------------------------

const SEED_DATA: Record<string, AptPrice[]> = {
  // ── 서울 ──
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
    { name: "반포동 래미안퍼스티지", dong: "반포동", price: 520000, area: 44, lat: 37.5050, lng: 126.9980, change: 1.3, year: 2009 },
  ],
  "송파구": [
    { name: "잠실동 엘스", dong: "잠실동", price: 295000, area: 33, lat: 37.5100, lng: 127.0830, change: 1.3, year: 2008 },
    { name: "잠실동 리센츠", dong: "잠실동", price: 285000, area: 33, lat: 37.5110, lng: 127.0860, change: 1.1, year: 2008 },
    { name: "잠실동 트리지움", dong: "잠실동", price: 265000, area: 33, lat: 37.5080, lng: 127.0800, change: 0.9, year: 2008 },
    { name: "가락동 헬리오시티", dong: "가락동", price: 235000, area: 34, lat: 37.4960, lng: 127.1180, change: 2.0, year: 2018 },
    { name: "문정동 래미안", dong: "문정동", price: 175000, area: 25, lat: 37.4850, lng: 127.1230, change: 0.4, year: 2010 },
    { name: "방이동 올림픽선수기자촌", dong: "방이동", price: 265000, area: 34, lat: 37.5175, lng: 127.1130, change: 1.7, year: 1988 },
  ],
  "강동구": [
    { name: "둔촌동 올림픽파크포레온", dong: "둔촌동", price: 198000, area: 34, lat: 37.5230, lng: 127.1350, change: 3.2, year: 2024 },
    { name: "고덕동 래미안힐스테이트", dong: "고덕동", price: 165000, area: 34, lat: 37.5560, lng: 127.1540, change: 1.5, year: 2019 },
    { name: "암사동 선사현대", dong: "암사동", price: 125000, area: 32, lat: 37.5530, lng: 127.1310, change: 0.8, year: 2000 },
    { name: "명일동 삼익가든", dong: "명일동", price: 108000, area: 25, lat: 37.5490, lng: 127.1450, change: -0.3, year: 1992 },
  ],
  "마포구": [
    { name: "아현동 마포래미안푸르지오", dong: "아현동", price: 185000, area: 34, lat: 37.5510, lng: 126.9560, change: 1.5, year: 2014 },
    { name: "공덕동 래미안", dong: "공덕동", price: 168000, area: 25, lat: 37.5440, lng: 126.9510, change: 0.8, year: 2012 },
    { name: "상암동 DMC파크뷰자이", dong: "상암동", price: 125000, area: 33, lat: 37.5780, lng: 126.8900, change: -0.5, year: 2010 },
    { name: "용강동 래미안", dong: "용강동", price: 152000, area: 24, lat: 37.5380, lng: 126.9420, change: 1.0, year: 2017 },
    { name: "대흥동 e편한세상", dong: "대흥동", price: 138000, area: 25, lat: 37.5480, lng: 126.9440, change: 0.6, year: 2009 },
  ],
  "용산구": [
    { name: "한남동 한남더힐", dong: "한남동", price: 720000, area: 59, lat: 37.5340, lng: 127.0010, change: 0.5, year: 2011 },
    { name: "이촌동 래미안첼리투스", dong: "이촌동", price: 310000, area: 34, lat: 37.5200, lng: 126.9700, change: 1.8, year: 2018 },
    { name: "원효로 시티파크", dong: "원효로", price: 165000, area: 25, lat: 37.5350, lng: 126.9630, change: 0.9, year: 2006 },
    { name: "이태원동 남산타운", dong: "이태원동", price: 195000, area: 33, lat: 37.5380, lng: 126.9930, change: 0.4, year: 2002 },
  ],
  "성동구": [
    { name: "성수동 트리마제", dong: "성수동", price: 380000, area: 49, lat: 37.5430, lng: 127.0540, change: 1.2, year: 2017 },
    { name: "옥수동 래미안", dong: "옥수동", price: 245000, area: 34, lat: 37.5400, lng: 127.0170, change: 0.8, year: 2012 },
    { name: "행당동 래미안", dong: "행당동", price: 165000, area: 25, lat: 37.5570, lng: 127.0310, change: 1.5, year: 2009 },
    { name: "금호동 e편한세상", dong: "금호동", price: 178000, area: 25, lat: 37.5510, lng: 127.0090, change: 0.6, year: 2007 },
  ],
  "광진구": [
    { name: "자양동 래미안프리미어", dong: "자양동", price: 188000, area: 34, lat: 37.5350, lng: 127.0710, change: 1.1, year: 2010 },
    { name: "구의동 현대프라임", dong: "구의동", price: 152000, area: 33, lat: 37.5430, lng: 127.0870, change: 0.5, year: 2004 },
    { name: "광장동 워커힐", dong: "광장동", price: 175000, area: 36, lat: 37.5530, lng: 127.1030, change: -0.2, year: 1999 },
  ],
  "동작구": [
    { name: "흑석동 아크로리버하임", dong: "흑석동", price: 225000, area: 34, lat: 37.5060, lng: 126.9620, change: 2.1, year: 2019 },
    { name: "사당동 래미안", dong: "사당동", price: 138000, area: 25, lat: 37.4830, lng: 126.9780, change: 0.7, year: 2005 },
    { name: "노량진동 래미안", dong: "노량진동", price: 145000, area: 25, lat: 37.5130, lng: 126.9450, change: 0.9, year: 2008 },
  ],
  "영등포구": [
    { name: "여의도동 시범", dong: "여의도동", price: 285000, area: 33, lat: 37.5220, lng: 126.9260, change: 0.8, year: 1971 },
    { name: "여의도동 래미안에스티움", dong: "여의도동", price: 320000, area: 34, lat: 37.5250, lng: 126.9310, change: 1.2, year: 2016 },
    { name: "당산동 래미안", dong: "당산동", price: 148000, area: 25, lat: 37.5330, lng: 126.9060, change: 0.5, year: 2010 },
    { name: "문래동 래미안", dong: "문래동", price: 118000, area: 24, lat: 37.5170, lng: 126.8970, change: 0.3, year: 2008 },
  ],
  "양천구": [
    { name: "목동 신시가지7단지", dong: "목동", price: 225000, area: 34, lat: 37.5380, lng: 126.8690, change: 1.3, year: 1986 },
    { name: "목동 현대하이페리온", dong: "목동", price: 198000, area: 44, lat: 37.5290, lng: 126.8750, change: 0.9, year: 2003 },
    { name: "신정동 래미안", dong: "신정동", price: 108000, area: 25, lat: 37.5200, lng: 126.8530, change: 0.4, year: 2005 },
  ],
  "강서구": [
    { name: "마곡동 마곡엠밸리7단지", dong: "마곡동", price: 128000, area: 34, lat: 37.5630, lng: 126.8270, change: 1.8, year: 2015 },
    { name: "등촌동 래미안", dong: "등촌동", price: 95000, area: 25, lat: 37.5570, lng: 126.8580, change: 0.5, year: 2004 },
    { name: "화곡동 우장산래미안", dong: "화곡동", price: 88000, area: 25, lat: 37.5430, lng: 126.8370, change: 0.3, year: 2006 },
  ],
  "구로구": [
    { name: "구로동 e편한세상", dong: "구로동", price: 85000, area: 25, lat: 37.4940, lng: 126.8830, change: 0.6, year: 2008 },
    { name: "신도림동 대림e편한세상", dong: "신도림동", price: 98000, area: 25, lat: 37.5070, lng: 126.8890, change: 0.4, year: 2005 },
    { name: "개봉동 래미안", dong: "개봉동", price: 72000, area: 24, lat: 37.4930, lng: 126.8560, change: 0.8, year: 2010 },
  ],
  "금천구": [
    { name: "시흥동 벽산", dong: "시흥동", price: 62000, area: 25, lat: 37.4500, lng: 126.9010, change: 0.5, year: 2001 },
    { name: "독산동 래미안", dong: "독산동", price: 68000, area: 24, lat: 37.4670, lng: 126.8960, change: 0.7, year: 2006 },
  ],
  "관악구": [
    { name: "봉천동 e편한세상", dong: "봉천동", price: 105000, area: 25, lat: 37.4780, lng: 126.9510, change: 0.8, year: 2010 },
    { name: "신림동 래미안", dong: "신림동", price: 88000, area: 24, lat: 37.4660, lng: 126.9280, change: 0.4, year: 2008 },
  ],
  "노원구": [
    { name: "상계동 주공5단지", dong: "상계동", price: 72000, area: 25, lat: 37.6560, lng: 127.0670, change: 1.2, year: 1988 },
    { name: "중계동 래미안", dong: "중계동", price: 95000, area: 33, lat: 37.6440, lng: 127.0710, change: 0.8, year: 2004 },
    { name: "하계동 현대", dong: "하계동", price: 78000, area: 25, lat: 37.6370, lng: 127.0630, change: 0.3, year: 1995 },
  ],
  "도봉구": [
    { name: "창동 주공19단지", dong: "창동", price: 68000, area: 24, lat: 37.6530, lng: 127.0380, change: 0.9, year: 1989 },
    { name: "방학동 래미안", dong: "방학동", price: 58000, area: 24, lat: 37.6680, lng: 127.0430, change: 0.4, year: 2002 },
  ],
  "강북구": [
    { name: "미아동 SK북한산시티", dong: "미아동", price: 75000, area: 33, lat: 37.6250, lng: 127.0290, change: 0.6, year: 2007 },
    { name: "번동 래미안", dong: "번동", price: 62000, area: 25, lat: 37.6350, lng: 127.0250, change: 0.3, year: 2004 },
  ],
  "성북구": [
    { name: "길음동 래미안", dong: "길음동", price: 98000, area: 33, lat: 37.6080, lng: 127.0250, change: 0.7, year: 2004 },
    { name: "장위동 래미안", dong: "장위동", price: 82000, area: 25, lat: 37.6180, lng: 127.0510, change: 1.5, year: 2024 },
    { name: "정릉동 래미안", dong: "정릉동", price: 72000, area: 25, lat: 37.6100, lng: 127.0060, change: 0.4, year: 2003 },
  ],
  "동대문구": [
    { name: "전농동 래미안크레시티", dong: "전농동", price: 108000, area: 34, lat: 37.5790, lng: 127.0590, change: 1.3, year: 2019 },
    { name: "이문동 래미안", dong: "이문동", price: 85000, area: 25, lat: 37.5960, lng: 127.0600, change: 1.8, year: 2025 },
    { name: "청량리동 한양수자인", dong: "청량리동", price: 98000, area: 25, lat: 37.5830, lng: 127.0470, change: 0.5, year: 2021 },
  ],
  "중랑구": [
    { name: "면목동 래미안", dong: "면목동", price: 72000, area: 25, lat: 37.5830, lng: 127.0870, change: 0.6, year: 2006 },
    { name: "상봉동 쌍용", dong: "상봉동", price: 65000, area: 24, lat: 37.5960, lng: 127.0870, change: 0.3, year: 1998 },
  ],
  "종로구": [
    { name: "평창동 현대", dong: "평창동", price: 195000, area: 50, lat: 37.6090, lng: 126.9710, change: 0.2, year: 2000 },
    { name: "무악동 경희궁자이", dong: "무악동", price: 178000, area: 34, lat: 37.5720, lng: 126.9650, change: 0.8, year: 2017 },
  ],
  "은평구": [
    { name: "수색동 DMC래미안", dong: "수색동", price: 98000, area: 34, lat: 37.5830, lng: 126.8950, change: 1.0, year: 2015 },
    { name: "응암동 래미안", dong: "응암동", price: 78000, area: 25, lat: 37.5950, lng: 126.9170, change: 0.5, year: 2005 },
    { name: "녹번동 e편한세상", dong: "녹번동", price: 85000, area: 25, lat: 37.6040, lng: 126.9350, change: 0.7, year: 2010 },
  ],
  "서대문구": [
    { name: "북가좌동 DMC파크뷰자이", dong: "북가좌동", price: 115000, area: 34, lat: 37.5740, lng: 126.9120, change: 1.2, year: 2016 },
    { name: "남가좌동 래미안", dong: "남가좌동", price: 88000, area: 25, lat: 37.5720, lng: 126.9200, change: 0.4, year: 2008 },
  ],
  "중구": [
    { name: "신당동 래미안하이베르", dong: "신당동", price: 145000, area: 34, lat: 37.5610, lng: 127.0080, change: 0.9, year: 2014 },
    { name: "황학동 e편한세상", dong: "황학동", price: 125000, area: 25, lat: 37.5660, lng: 127.0150, change: 0.5, year: 2012 },
  ],

  // ── 경기 주요 도시 ──
  "분당구": [
    { name: "정자동 파크뷰", dong: "정자동", price: 195000, area: 34, lat: 37.3660, lng: 127.1080, change: 1.5, year: 2009 },
    { name: "수내동 파크타운", dong: "수내동", price: 175000, area: 33, lat: 37.3770, lng: 127.1110, change: 0.8, year: 1993 },
    { name: "서현동 시범한양", dong: "서현동", price: 152000, area: 34, lat: 37.3840, lng: 127.1230, change: 0.6, year: 1991 },
    { name: "판교동 봇들마을", dong: "판교동", price: 218000, area: 34, lat: 37.3920, lng: 127.0960, change: 1.2, year: 2010 },
  ],
  "수원영통구": [
    { name: "영통동 자이", dong: "영통동", price: 72000, area: 34, lat: 37.2530, lng: 127.0560, change: 0.8, year: 2006 },
    { name: "망포동 래미안", dong: "망포동", price: 68000, area: 33, lat: 37.2610, lng: 127.0680, change: 1.2, year: 2010 },
    { name: "광교동 자연앤힐스테이트", dong: "광교동", price: 108000, area: 34, lat: 37.2850, lng: 127.0470, change: 1.5, year: 2015 },
  ],
  "고양일산동구": [
    { name: "장항동 웨스턴돔", dong: "장항동", price: 75000, area: 34, lat: 37.6580, lng: 126.7710, change: 0.6, year: 2003 },
    { name: "마두동 강촌", dong: "마두동", price: 62000, area: 34, lat: 37.6560, lng: 126.7830, change: 0.3, year: 1994 },
    { name: "백석동 힐스테이트", dong: "백석동", price: 68000, area: 25, lat: 37.6530, lng: 126.7730, change: 0.5, year: 2008 },
  ],
  "용인수지구": [
    { name: "성복동 래미안이스트팰리스", dong: "성복동", price: 118000, area: 34, lat: 37.3180, lng: 127.0760, change: 1.0, year: 2012 },
    { name: "죽전동 자이", dong: "죽전동", price: 95000, area: 33, lat: 37.3250, lng: 127.1070, change: 0.7, year: 2006 },
    { name: "풍덕천동 래미안", dong: "풍덕천동", price: 85000, area: 25, lat: 37.3230, lng: 127.0940, change: 0.4, year: 2004 },
  ],
  "화성동탄": [
    { name: "동탄2 시범다은마을", dong: "동탄", price: 78000, area: 34, lat: 37.2040, lng: 127.0730, change: 1.8, year: 2018 },
    { name: "동탄1 메타폴리스", dong: "동탄", price: 68000, area: 34, lat: 37.2000, lng: 127.0600, change: 0.5, year: 2009 },
    { name: "동탄2 A90블록", dong: "동탄", price: 72000, area: 25, lat: 37.1990, lng: 127.0850, change: 2.5, year: 2020 },
  ],
  "하남시": [
    { name: "미사동 호반써밋", dong: "미사동", price: 105000, area: 34, lat: 37.5640, lng: 127.1900, change: 1.3, year: 2017 },
    { name: "감일동 래미안", dong: "감일동", price: 95000, area: 25, lat: 37.5470, lng: 127.1820, change: 1.8, year: 2021 },
    { name: "위례동 송파힐스테이트", dong: "위례", price: 115000, area: 34, lat: 37.4780, lng: 127.1420, change: 0.9, year: 2016 },
  ],
  "과천시": [
    { name: "별양동 래미안슈르", dong: "별양동", price: 265000, area: 34, lat: 37.4310, lng: 126.9920, change: 1.5, year: 2006 },
    { name: "원문동 주공10단지", dong: "원문동", price: 218000, area: 33, lat: 37.4280, lng: 127.0010, change: 0.8, year: 1988 },
    { name: "과천지식정보타운", dong: "과천", price: 195000, area: 34, lat: 37.4170, lng: 127.0050, change: 2.8, year: 2024 },
  ],
};

// 구/시 → 지역 그룹
const REGION_GROUPS: Record<string, string[]> = {
  "서울 강남권": ["강남구", "서초구", "송파구", "강동구"],
  "서울 마용성": ["마포구", "용산구", "성동구"],
  "서울 여의도·영등포": ["영등포구", "동작구", "양천구"],
  "서울 강서·구로": ["강서구", "구로구", "금천구"],
  "서울 종로·중구": ["종로구", "중구", "광진구"],
  "서울 노도강": ["노원구", "도봉구", "강북구"],
  "서울 기타": ["성북구", "동대문구", "중랑구", "은평구", "서대문구", "관악구"],
  "경기 남부": ["분당구", "수원영통구", "용인수지구", "화성동탄", "과천시"],
  "경기 북부·동부": ["고양일산동구", "하남시"],
};

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
  const tradeType = searchParams.get("type") || "매매";

  let data = SEED_DATA[gu] || [];

  if (minPrice > 0 || maxPrice < 9999999) {
    data = data.filter(d => d.price >= minPrice && d.price <= maxPrice);
  }

  const availableGus = Object.keys(SEED_DATA);

  return NextResponse.json({
    gu,
    tradeType,
    apartments: data,
    center: data.length > 0
      ? { lat: data.reduce((s, d) => s + d.lat, 0) / data.length, lng: data.reduce((s, d) => s + d.lng, 0) / data.length }
      : { lat: 37.4979, lng: 127.0276 },
    availableGus,
    regionGroups: REGION_GROUPS,
    total: data.length,
  });
}
