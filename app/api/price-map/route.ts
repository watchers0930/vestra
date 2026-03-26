/**
 * 시세 지도 API — 구/시별 아파트 실거래가 + 좌표 반환
 * 서울 25개 구 + 경기 주요 도시 지원
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchRecentPrices, fetchRecentRentPrices, LAWD_CODE_MAP } from "@/lib/molit-api";
// fetchREBMarketData 제거 — 단지별 실거래 데이터만 사용
import { apiCache, APICache } from "@/lib/api-cache";
import { kvCache } from "@/lib/kv-cache";
import { AptPrice, SEED_DATA, DONG_CENTER, GU_CENTER, GU_ADDRESS_MAP, REGION_GROUPS } from "@/lib/price-map-data";

// 카카오 REST API로 아파트 실제 좌표 검색
const GEOCODE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

// 주거 관련 카테고리 판별
function isResidentialCategory(cat: string): boolean {
  return /아파트|주거|빌딩|주택|오피스텔/.test(cat || "");
}

// 두 좌표 간 거리 계산 (km) — Haversine 공식
function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 카카오 주소 검색 API — 도로명/지번 주소를 정확한 좌표로 변환
async function kakaoAddressSearch(kakaoKey: string, query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=5`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
    if (!res.ok) return null;
    const json = await res.json();
    const docs = json.documents || [];
    if (docs[0]) return { lat: parseFloat(docs[0].y), lng: parseFloat(docs[0].x) };
  } catch { /* ignore */ }
  return null;
}

// 카카오 키워드 검색 — 아파트 카테고리(AP4) 필터 지원
async function kakaoKeywordSearch(
  kakaoKey: string,
  query: string,
  center?: { lat: number; lng: number },
  categoryGroupCode?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
    if (categoryGroupCode) {
      url += `&category_group_code=${categoryGroupCode}`;
    }
    if (center) {
      url += `&x=${center.lng}&y=${center.lat}&radius=5000&sort=distance`;
    }
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
    if (!res.ok) return null;
    const json = await res.json();
    const docs = json.documents || [];

    // 1순위: 카테고리에 "아파트" 포함
    const aptDoc = docs.find((d: any) => d.category_name?.includes("아파트"));
    if (aptDoc) return { lat: parseFloat(aptDoc.y), lng: parseFloat(aptDoc.x) };

    // 2순위: 주거 관련 카테고리 (빌딩, 주거, 주택, 오피스텔)
    const residDoc = docs.find((d: any) => isResidentialCategory(d.category_name));
    if (residDoc) return { lat: parseFloat(residDoc.y), lng: parseFloat(residDoc.x) };

    // 3순위: 첫 번째 결과 (폴백)
    if (docs[0]) return { lat: parseFloat(docs[0].y), lng: parseFloat(docs[0].x) };
  } catch { /* ignore */ }
  return null;
}

// 거리 검증: center에서 maxKm 이내인지 확인
function validateDistance(coord: { lat: number; lng: number }, center: { lat: number; lng: number } | undefined, maxKm: number): boolean {
  if (!center) return false; // center 없으면 검증 불가 → 거부 (안전 우선)
  return haversineDistance(coord, center) <= maxKm;
}

async function geocodeApt(gu: string, dong: string, aptName: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = APICache.makeKey("geocode", gu, dong, aptName);
  const cached = await kvCache.get<{ lat: number; lng: number }>(cacheKey);
  if (cached) return cached;

  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!kakaoKey) return null;

  const guCenter = GU_CENTER[gu] || { lat: 37.4979, lng: 127.0276 }; // 강남 기본값
  const center = DONG_CENTER[dong] || guCenter;
  const MAX_DISTANCE_KM = 5; // 구 중심에서 5km 이상이면 부정확한 결과로 판단

  // 아파트명 정제: 괄호/숫자 제거 (예: "신동아(22)" → "신동아")
  const cleanName = aptName.replace(/\(.*?\)/g, "").replace(/\d+$/g, "").trim();

  // ── 1단계: 카카오 주소 검색 (가장 정확) ──
  // 동+아파트명 조합으로 주소 검색 API 사용
  const addressQueries = [
    `${gu} ${dong} ${cleanName}`,
    `${dong} ${cleanName}`,
  ];
  for (const q of addressQueries) {
    const coord = await kakaoAddressSearch(kakaoKey, q);
    if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
      await kvCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }

  // ── 2단계: 카카오 키워드 검색 + 아파트 카테고리 필터 (AP4) ──
  const categoryQueries = [
    `${gu} ${dong} ${cleanName}아파트`,
    `${dong} ${cleanName}아파트`,
    `${cleanName}아파트`,
  ];
  for (const q of categoryQueries) {
    const coord = await kakaoKeywordSearch(kakaoKey, q, center, "AP4");
    if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
      await kvCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }

  // ── 3단계: 카카오 키워드 검색 (카테고리 필터 없음, 폴백) ──
  const fallbackQueries = [
    `${gu} ${dong} ${cleanName}아파트`,
    `${gu} ${dong} ${cleanName}`,
    `${dong} ${cleanName}아파트`,
    `${cleanName}`,
    `${gu} ${cleanName}`,
  ];
  for (const q of fallbackQueries) {
    const coord = await kakaoKeywordSearch(kakaoKey, q, center);
    if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
      await kvCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }

  return null;
}

// 여러 아파트 좌표를 병렬로 조회 (배치 단위 + 전체 타임아웃)
async function geocodeAll(apartments: { gu: string; dong: string; name: string }[]): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  const BATCH_SIZE = 10;
  const TOTAL_TIMEOUT = 8000; // 전체 geocoding 8초 제한 (Vercel 10초 함수 제한 고려)
  const startTime = Date.now();

  for (let i = 0; i < apartments.length; i += BATCH_SIZE) {
    // 타임아웃 체크
    if (Date.now() - startTime > TOTAL_TIMEOUT) {
      console.log(`[geocode] Timeout after ${results.size}/${apartments.length} apartments`);
      break;
    }
    const batch = apartments.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (apt) => {
      const coord = await geocodeApt(apt.gu, apt.dong, apt.name);
      if (coord) results.set(apt.name, coord);
    });
    await Promise.allSettled(promises);
  }
  return results;
}

// 폴백: 동 중심 좌표에 산포 (geocode 실패 시)
function spreadCoord(center: { lat: number; lng: number }, index: number, total: number): { lat: number; lng: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1);
  const radius = 0.002 + (index % 3) * 0.001;
  return {
    lat: center.lat + radius * Math.cos(angle),
    lng: center.lng + radius * Math.sin(angle),
  };
}

// 단지 평균가 변동률 — 최근 6개월 평균 vs 이전 6개월 평균 (㎡당 단가 기준)
function calcChangeByArea(txs: { amount: number; area: number }[]): number {
  // 면적 0인 거래 제외, ㎡당 단가로 정규화 (평형 차이 제거)
  const valid = txs.filter(t => t.area > 0 && t.amount > 0);
  if (valid.length < 4) return 0;

  // txs는 최신순 정렬 — 절반으로 분할 (최근 vs 이전)
  const mid = Math.floor(valid.length / 2);
  const recent = valid.slice(0, mid);
  const older = valid.slice(mid);

  // ㎡당 단가의 중앙값 비교 (면적 차이 + 이상치 노이즈 동시 제거)
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const recentMedian = median(recent.map(t => t.amount / t.area));
  const olderMedian = median(older.map(t => t.amount / t.area));

  if (olderMedian <= 0) return 0;
  return +((recentMedian - olderMedian) / olderMedian * 100).toFixed(1);
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = await rateLimit(`price-map:${ip}`, 30);
  if (!rl.success) {
    return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const { searchParams } = req.nextUrl;
  const gu = searchParams.get("gu") || "강남구";

  // 입력 검증: 허용된 구 목록에 없으면 400
  const allowedGus = Object.keys(SEED_DATA);
  if (!allowedGus.includes(gu)) {
    return NextResponse.json({ error: "지원하지 않는 지역입니다", availableGus: allowedGus }, { status: 400 });
  }

  const minPrice = parseInt(searchParams.get("minPrice") || "0");
  const maxPrice = parseInt(searchParams.get("maxPrice") || "9999999");
  const tradeType = searchParams.get("type") === "전세" ? "전세" : "매매";

  // MOLIT 실거래가 API 시도 → 실패 시 시드 데이터 폴백
  let data: AptPrice[] = [];
  let dataSource: "molit" | "seed" = "seed";

  // 구 이름 → 법정동 코드 매핑 (LAWD_CODE_MAP에서 검색)
  const guToAddress = GU_ADDRESS_MAP[gu];
  const lawdCode = guToAddress ? LAWD_CODE_MAP[guToAddress] : undefined;

  if (lawdCode && process.env.MOLIT_API_KEY) {
    try {
      // 전세/매매 공통 처리
      const txResult = tradeType === "전세"
        ? await fetchRecentRentPrices(guToAddress, 12)
        : await fetchRecentPrices(guToAddress, 12);

      if (txResult && txResult.transactions.length > 0) {
        // 아파트명별 그룹핑
        const grouped = new Map<string, typeof txResult.transactions[0][]>();
        for (const tx of txResult.transactions) {
          const key = tx.aptName || "알수없음";
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(tx);
        }

        const seedApts = SEED_DATA[gu] || [];
        const seedMap = new Map(seedApts.map(s => [s.name, s]));
        const entries = [...grouped.entries()];

        // 좌표 조회: KV캐시 → 시드 데이터 → 카카오 geocode API
        const geocoded = new Map<string, { lat: number; lng: number }>();

        // 1단계: 시드 데이터에 없는 아파트만 KV 캐시 확인
        const needsGeocode: { gu: string; dong: string; name: string }[] = [];
        await Promise.allSettled(entries.map(async ([aptName, txs]) => {
          if (seedMap.has(aptName)) return; // 시드 데이터 있으면 스킵 (좌표 사용)
          const cacheKey = APICache.makeKey("geocode", gu, txs[0].dong || "", aptName);
          const cached = await kvCache.get<{ lat: number; lng: number }>(cacheKey);
          if (cached) {
            geocoded.set(aptName, cached);
          } else {
            needsGeocode.push({ gu, dong: txs[0].dong || "", name: aptName });
          }
        }));

        // 2단계: 캐시 미스 아파트 → 카카오 geocode API 호출 (배치 + 타임아웃)
        if (needsGeocode.length > 0) {
          const freshCoords = await geocodeAll(needsGeocode);
          for (const [name, coord] of freshCoords) {
            geocoded.set(name, coord);
          }
        }

        const totalEntries = entries.length;
        entries.forEach(([aptName, txs], idx) => {
          const latest = txs[0];
          const seed = seedMap.get(aptName);
          const amount = tradeType === "전세"
            ? (latest as { deposit?: number }).deposit || 0
            : (latest as { dealAmount?: number }).dealAmount || 0;
          if (amount <= 0) return;

          const priceInMan = Math.round(amount / 10000);
          const change = calcChangeByArea(txs.map(t => ({
            amount: tradeType === "전세" ? ((t as { deposit?: number }).deposit || 0) : ((t as { dealAmount?: number }).dealAmount || 0),
            area: t.area || 0,
          })));
          // 거래 부족(0)이면 null → 프론트에서 변동률 미표시

          // 좌표 우선순위: 1) KV캐시 geocode → 2) 시드 데이터 → 정확한 좌표 없으면 제외
          const coords = geocoded.get(aptName)
            || (seed ? { lat: seed.lat, lng: seed.lng } : null);
          if (!coords) return; // geocode 실패 → 지도에 미표시 (가짜 좌표 방지)

          data.push({
            name: aptName,
            dong: latest.dong || "",
            price: priceInMan,
            area: latest.area ? Math.round((latest.area * 1.45) / 3.3058) : 0,
            lat: coords.lat,
            lng: coords.lng,
            change: change !== 0 ? change : null,
            year: latest.buildYear || 0,
          });
        });
        if (data.length > 0) dataSource = "molit";
      }
    } catch (err) {
      console.error("[price-map] MOLIT API 호출 실패, 시드 데이터로 폴백:", err);
    }
  }

  // MOLIT 실패 or 데이터 없음 → 시드 데이터 폴백
  if (data.length === 0) {
    data = [...(SEED_DATA[gu] || [])];
    dataSource = "seed";
  }

  // 캐시된 좌표로 보정 (API 호출 없음 — 타임아웃 방지)
  if (dataSource === "molit" && data.length > 0) {
    await Promise.allSettled(data.map(async (a) => {
      const cacheKey = APICache.makeKey("geocode", gu, a.dong, a.name);
      const cached = await kvCache.get<{ lat: number; lng: number }>(cacheKey);
      if (cached) { a.lat = cached.lat; a.lng = cached.lng; }
    }));
  }

  if (minPrice > 0 || maxPrice < 9999999) {
    data = data.filter(d => d.price >= minPrice && d.price <= maxPrice);
  }

  const availableGus = Object.keys(SEED_DATA);

  return NextResponse.json({
    gu,
    tradeType,
    dataSource,
    apartments: data,
    center: data.length > 0
      ? { lat: data.reduce((s, d) => s + d.lat, 0) / data.length, lng: data.reduce((s, d) => s + d.lng, 0) / data.length }
      : GU_CENTER[gu] || { lat: 37.4979, lng: 127.0276 },
    availableGus,
    regionGroups: REGION_GROUPS,
    total: data.length,
  });
}
