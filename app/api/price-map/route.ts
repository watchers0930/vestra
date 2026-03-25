/**
 * 시세 지도 API — 구/시별 아파트 실거래가 + 좌표 반환
 * 서울 25개 구 + 경기 주요 도시 지원
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchRecentPrices, fetchRecentRentPrices, LAWD_CODE_MAP } from "@/lib/molit-api";
import { apiCache, APICache } from "@/lib/api-cache";
import { AptPrice, SEED_DATA, DONG_CENTER, GU_CENTER, GU_ADDRESS_MAP, REGION_GROUPS } from "@/lib/price-map-data";

// 카카오 REST API로 아파트 실제 좌표 검색
const GEOCODE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

// 주거 관련 카테고리 판별
function isResidentialCategory(cat: string): boolean {
  return /아파트|주거|빌딩|주택|오피스텔/.test(cat || "");
}

// 구 중심 좌표 기준 반경 내 검색 — 주거 카테고리 우선
async function kakaoSearch(kakaoKey: string, query: string, center?: { lat: number; lng: number }): Promise<{ lat: number; lng: number } | null> {
  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
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

async function geocodeApt(gu: string, dong: string, aptName: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = APICache.makeKey("geocode", gu, dong, aptName);
  const cached = apiCache.get<{ lat: number; lng: number }>(cacheKey);
  if (cached) return cached;

  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!kakaoKey) return null;

  const center = DONG_CENTER[dong] || GU_CENTER[gu];

  // 아파트명 정제: 괄호/숫자 제거 (예: "신동아(22)" → "신동아")
  const cleanName = aptName.replace(/\(.*?\)/g, "").replace(/\d+$/g, "").trim();

  // 검색 전략 (5단계 — 정확도순)
  const queries = [
    `${gu} ${dong} ${cleanName}아파트`,       // 1) 구+동+이름아파트
    `${gu} ${dong} ${cleanName}`,              // 2) 구+동+이름 (아파트 없이)
    `${dong} ${cleanName}아파트`,              // 3) 동+이름아파트
    `${cleanName}`,                             // 4) 이름만 (한강자이에클라트 같은 경우)
    `${gu} ${cleanName}`,                       // 5) 구+이름
  ];

  for (const q of queries) {
    const coord = await kakaoSearch(kakaoKey, q, center);
    if (coord) {
      apiCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }
  return null;
}

// 여러 아파트 좌표를 병렬로 조회 (배치 단위로 rate limit 관리)
async function geocodeAll(apartments: { gu: string; dong: string; name: string }[]): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  const BATCH_SIZE = 10;
  for (let i = 0; i < apartments.length; i += BATCH_SIZE) {
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

// 동일 면적대 거래끼리 변동률 계산 (면적 ±5㎡ 범위)
function calcChangeByArea(txs: { amount: number; area: number }[]): number {
  if (txs.length < 2) return 0;
  const latest = txs[0];
  // 최근 거래와 동일 면적대(±5㎡) 이전 거래만 필터
  const sameArea = txs.slice(1).filter(t => Math.abs(t.area - latest.area) <= 5);
  if (sameArea.length === 0) return 0;
  const avgOlder = sameArea.reduce((s, t) => s + t.amount, 0) / sameArea.length;
  if (avgOlder <= 0) return 0;
  return +((latest.amount - avgOlder) / avgOlder * 100).toFixed(1);
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
        ? await fetchRecentRentPrices(guToAddress, 3)
        : await fetchRecentPrices(guToAddress, 3);

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

        // 좌표가 없는 아파트들을 카카오 REST API로 일괄 geocoding
        const needsGeocode = entries
          .filter(([aptName]) => !seedMap.has(aptName))
          .map(([aptName, txs]) => ({ gu, dong: txs[0].dong || "", name: aptName }));
        const geocoded = await geocodeAll(needsGeocode);

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

          // 좌표 우선순위: geocode → 동 중심 폴백
          const dongCenter = DONG_CENTER[latest.dong || ""] || GU_CENTER[gu] || { lat: 37.4979, lng: 127.0276 };
          const coords = geocoded.get(aptName) || spreadCoord(dongCenter, idx, totalEntries);

          data.push({
            name: aptName,
            dong: latest.dong || "",
            price: priceInMan,
            area: latest.area ? Math.round((latest.area * 1.45) / 3.3058) : 0,
            lat: coords.lat,
            lng: coords.lng,
            change,
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

  // MOLIT 데이터 좌표를 카카오 geocoding으로 보정 (시드 데이터는 스킵 — API 절약)
  if (dataSource === "molit" && data.length > 0 && process.env.KAKAO_REST_KEY) {
    const toGeocode = data.map(a => ({ gu, dong: a.dong, name: a.name }));
    const geocoded = await geocodeAll(toGeocode);
    data = data.map(a => {
      const coord = geocoded.get(a.name);
      return coord ? { ...a, lat: coord.lat, lng: coord.lng } : a;
    });
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
