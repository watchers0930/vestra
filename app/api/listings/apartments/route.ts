import { NextRequest, NextResponse } from "next/server";
import { LAWD_CODE_MAP } from "@/lib/molit/molit-data";
import { fetchRealTransactions } from "@/lib/molit-api";
import { apiCache, APICache } from "@/lib/api-cache";

interface AptItem {
  id: string;
  aptName: string;
  dong: string;
  jibun: string | null;
  area: number;
  floor: number;
  buildYear: number;
  dealAmount: number;
  dealDate: string;
  lat?: number;
  lng?: number;
}

// 카카오 API 단건 좌표 조회 (address.json / keyword.json 공용)
async function kakaoFetchCoord(url: string, kakaoKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json.documents?.[0];
    if (!doc?.x || !doc?.y) return null;
    return { lat: Number(doc.y), lng: Number(doc.x) };
  } catch {
    return null;
  }
}

// 아파트 좌표 조회 — 지번 주소 우선(정확), 실패 시 아파트명 키워드 폴백
async function geocodeApt(
  addressQuery: string | null,
  keywordQuery: string,
  kakaoKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = APICache.makeKey("kakao-geo", addressQuery || keywordQuery);
  const cached = apiCache.get<{ lat: number; lng: number }>(cacheKey);
  if (cached) return cached;

  let coord: { lat: number; lng: number } | null = null;
  // ① 지번 주소 검색 (지번이 있으면 우선 — 단지 정확 위치)
  if (addressQuery) {
    coord = await kakaoFetchCoord(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addressQuery)}&size=1`,
      kakaoKey,
    );
  }
  // ② 아파트명 키워드 폴백 (지번 없거나 주소 검색 실패 시)
  if (!coord) {
    coord = await kakaoFetchCoord(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keywordQuery)}&size=1`,
      kakaoKey,
    );
  }
  if (coord) apiCache.set(cacheKey, coord, 24 * 60 * 60 * 1000); // 24시간
  return coord;
}

// 동시성 제한 배치 실행
async function batched<T>(tasks: (() => Promise<T>)[], size = 8): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    out.push(...(await Promise.all(tasks.slice(i, i + size).map((f) => f()))));
  }
  return out;
}

// GET /api/listings/apartments — 국토교통부 아파트 매매 실거래 (지역별 최근)
//   공개 조회. query: region(시군구명, 기본 강남구), months(기본 6), limit(기본 30), geocode(1이면 좌표 부착)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = (searchParams.get("region") || "강남구").trim();
    const months = Math.min(12, Math.max(1, Number(searchParams.get("months") ?? "6")));
    const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? "30")));
    const doGeocode = searchParams.get("geocode") === "1";

    const lawdCd = LAWD_CODE_MAP[region] ?? LAWD_CODE_MAP["강남구"];

    const now = new Date();
    const ymds = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const results = await Promise.all(ymds.map((ymd) => fetchRealTransactions(lawdCd, ymd)));
    const all = results.flat();
    all.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay),
    );

    const items: AptItem[] = all.slice(0, limit).map((t, i) => ({
      id: `molit-${lawdCd}-${t.dealYear}${t.dealMonth}${t.dealDay}-${i}`,
      aptName: t.aptName,
      dong: t.dong,
      jibun: t.jibun ?? null,
      area: t.area,
      floor: t.floor,
      buildYear: t.buildYear,
      dealAmount: t.dealAmount,
      dealDate: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}.${String(t.dealDay).padStart(2, "0")}`,
    }));

    if (doGeocode) {
      const kakaoKey = process.env.KAKAO_REST_KEY;
      if (kakaoKey) {
        // 건물(동+아파트명) 단위로 중복 제거 후 지오코딩 (대표 지번 확보)
        const repJibun = new Map<string, string | null>();
        items.forEach((it) => {
          const k = `${it.dong}|${it.aptName}`;
          if (!repJibun.has(k)) repJibun.set(k, it.jibun ?? null);
        });
        const uniqueKeys = [...repJibun.keys()];
        const coordMap = new Map<string, { lat: number; lng: number }>();
        const coords = await batched(
          uniqueKeys.map((key) => async () => {
            const [dong, aptName] = key.split("|");
            const jibun = repJibun.get(key);
            const addressQuery = jibun ? `${region} ${dong} ${jibun}` : null;
            const c = await geocodeApt(addressQuery, `${region} ${dong} ${aptName}`, kakaoKey);
            return { key, c };
          }),
        );
        coords.forEach(({ key, c }) => { if (c) coordMap.set(key, c); });
        items.forEach((it) => {
          const c = coordMap.get(`${it.dong}|${it.aptName}`);
          if (c) { it.lat = c.lat; it.lng = c.lng; }
        });
      }
    }

    return NextResponse.json({ region, lawdCd, total: items.length, items });
  } catch (e) {
    console.error("[/api/listings/apartments] 오류:", e instanceof Error ? e.message : e);
    return NextResponse.json({ region: null, total: 0, items: [] });
  }
}
