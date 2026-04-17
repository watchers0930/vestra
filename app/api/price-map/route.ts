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

  // ── 1단계: 카카오 키워드 검색 + 아파트 카테고리 (AP4) — 가장 정확 ──
  const categoryQueries = [
    `${gu} ${dong} ${cleanName}아파트`,
    `${dong} ${cleanName}아파트`,
    `${gu} ${cleanName}아파트`,
    `${cleanName}아파트`,
  ];
  for (const q of categoryQueries) {
    const coord = await kakaoKeywordSearch(kakaoKey, q, center, "AP4");
    if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
      await kvCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }

  // ── 2단계: 카카오 키워드 검색 (카테고리 필터 없음, 폴백) ──
  const fallbackQueries = [
    `${gu} ${dong} ${cleanName}아파트`,
    `${dong} ${cleanName}아파트`,
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

// 단지 변동률 — 평당가(₩/㎡) 기반, 면적대별 가중평균
// 면적을 무시하면 24평→34평 거래 전환 시 가격 상승으로 왜곡됨
function calcChangeByArea(txs: { amount: number; area: number; dealYear?: number; dealMonth?: number }[]): number {
  const valid = txs.filter(t => t.amount > 0 && t.area > 0 && t.dealYear && t.dealMonth);
  if (valid.length < 4) return 0;

  const now = new Date();
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const cutoff = sixAgo.getFullYear() * 100 + (sixAgo.getMonth() + 1);

  // 면적대 그룹핑 (10㎡ 단위) → 같은 평형끼리만 비교
  const groups = new Map<number, { recent: number[]; older: number[] }>();

  for (const t of valid) {
    const ym = t.dealYear! * 100 + t.dealMonth!;
    const pricePerSqm = t.amount / t.area;
    const band = Math.round(t.area / 10) * 10; // 10㎡ 단위 그룹

    if (!groups.has(band)) groups.set(band, { recent: [], older: [] });
    const g = groups.get(band)!;
    if (ym >= cutoff) g.recent.push(pricePerSqm);
    else g.older.push(pricePerSqm);
  }

  // 비교 가능한 면적대만 (양쪽 모두 1건 이상)
  let weightedChange = 0;
  let totalWeight = 0;

  for (const [, g] of groups) {
    if (g.recent.length === 0 || g.older.length === 0) continue;
    const recentAvg = g.recent.reduce((s, v) => s + v, 0) / g.recent.length;
    const olderAvg = g.older.reduce((s, v) => s + v, 0) / g.older.length;
    if (olderAvg <= 0) continue;

    const change = (recentAvg - olderAvg) / olderAvg * 100;
    const weight = g.recent.length + g.older.length; // 거래 건수 가중
    weightedChange += change * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  const result = +(weightedChange / totalWeight).toFixed(1);

  // ±30% 초과는 데이터 이상으로 간주
  if (Math.abs(result) > 30) return 0;
  return result;
}

// DELETE: 특정 구의 geocode 캐시 초기화 (관리자용)
export async function DELETE(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const gu = searchParams.get("gu");
  if (!gu) return NextResponse.json({ error: "gu 파라미터 필요" }, { status: 400 });

  // KV에서 해당 구의 geocode 키 패턴 삭제
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import("@vercel/kv");
      const keys = await kv.keys("geocode:*");
      let deleted = 0;
      for (const key of keys) {
        await kv.del(key);
        deleted++;
      }
      return NextResponse.json({ ok: true, deleted, message: `전체 geocode 캐시 ${deleted}건 삭제` });
    } catch (err) {
      return NextResponse.json({ error: "KV 삭제 실패", detail: (err as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "KV 미설정 — 인메모리 캐시는 서버리스 재시작 시 자동 초기화" });
}

const RESPONSE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

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

  // ── 전체 응답 KV 캐시 조회 (가격 필터 없는 요청만 캐시 적용) ──
  const useResponseCache = minPrice === 0 && maxPrice === 9999999;
  const responseCacheKey = `price-map:${gu}:${tradeType}`;
  if (useResponseCache) {
    const cached = await kvCache.get<object>(responseCacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

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
            dealYear: (t as { dealYear?: number }).dealYear || 0,
            dealMonth: (t as { dealMonth?: number }).dealMonth || 0,
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

  const availableGus = Object.keys(SEED_DATA);

  const responsePayload = {
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
  };

  // 전체 응답 KV 캐시 저장 (가격 필터 없는 요청만)
  if (useResponseCache) {
    await kvCache.set(responseCacheKey, responsePayload, RESPONSE_CACHE_TTL);
  }

  // 가격 필터 적용 (캐시 저장 후 필터링 — 캐시에는 전체 데이터 보관)
  if (minPrice > 0 || maxPrice < 9999999) {
    responsePayload.apartments = responsePayload.apartments.filter(
      (d) => d.price >= minPrice && d.price <= maxPrice
    );
    responsePayload.total = responsePayload.apartments.length;
  }

  return NextResponse.json(responsePayload);
}
