/**
 * 시세 지도 API — 구/시별 아파트 실거래가 + 좌표 반환
 * 서울 25개 구 + 경기 주요 도시 지원
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  fetchRecentResidentialSalePrices,
  fetchRecentRentPrices,
  LAWD_CODE_MAP,
  type ResidentialSaleType,
} from "@/lib/molit-api";
// fetchREBMarketData 제거 — 단지별 실거래 데이터만 사용
import { APICache } from "@/lib/api-cache";
import { kvCache } from "@/lib/kv-cache";
import { DONG_CENTER, GU_CENTER, GU_ADDRESS_MAP, REGION_GROUPS } from "@/lib/price-map-data";
import type { AptData, PriceMapTradeType, PropertyType } from "@/app/(map)/price-map/types";

// 카카오 REST API로 아파트 실제 좌표 검색
const GEOCODE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

const PROPERTY_TYPES = ["아파트", "연립/빌라/다세대", "다가구/단독"] as const satisfies readonly PropertyType[];

function parsePropertyType(value: string | null): PropertyType {
  return PROPERTY_TYPES.includes(value as PropertyType) ? value as PropertyType : "아파트";
}

function toResidentialType(propertyType: PropertyType): ResidentialSaleType {
  if (propertyType === "연립/빌라/다세대") return "rowhouse";
  if (propertyType === "다가구/단독") return "singlehouse";
  return "apartment";
}

function parseTradeType(value: string | null): PriceMapTradeType {
  if (value === "전세" || value === "월세") return value;
  return "매매";
}

// 주거 관련 카테고리 판별
function isResidentialCategory(cat?: string): boolean {
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
// 카카오 키워드 검색 — 아파트 카테고리(AP4) 필터 지원
async function kakaoKeywordSearch(
  kakaoKey: string,
  query: string,
  center?: { lat: number; lng: number },
  categoryGroupCode?: string,
  preferApartment: boolean = true
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

    // 아파트 유형: 아파트 카테고리 우선
    if (preferApartment) {
      const aptDoc = docs.find((d: { category_name?: string }) => d.category_name?.includes("아파트"));
      if (aptDoc) return { lat: parseFloat(aptDoc.y), lng: parseFloat(aptDoc.x) };
    }

    // 주거 관련 카테고리 (빌딩, 주거, 주택, 오피스텔)
    const residDoc = docs.find((d: { category_name?: string }) => isResidentialCategory(d.category_name));
    if (residDoc) return { lat: parseFloat(residDoc.y), lng: parseFloat(residDoc.x) };

    // 폴백: 첫 번째 결과
    if (docs[0]) return { lat: parseFloat(docs[0].y), lng: parseFloat(docs[0].x) };
  } catch { /* ignore */ }
  return null;
}

async function kakaoAddressSearch(kakaoKey: string, query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=10`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
    if (!res.ok) return null;
    const json = await res.json();
    const docs = json.documents || [];
    const doc = docs[0];
    if (!doc) return null;
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch {
    return null;
  }
}

// 거리 검증: center에서 maxKm 이내인지 확인
function validateDistance(coord: { lat: number; lng: number }, center: { lat: number; lng: number } | undefined, maxKm: number): boolean {
  if (!center) return true;
  return haversineDistance(coord, center) <= maxKm;
}

function formatRegionAddressForSearch(regionAddress: string): string {
  if (regionAddress === "경상남도고성") return "경상남도 고성군";
  return regionAddress.replace(/^(부산|대구|인천|광주|대전|울산)(.+구)$/, "$1 $2");
}

async function geocodeApt(gu: string, dong: string, aptName: string, jibun?: string, propertyType: PropertyType = "아파트"): Promise<{ lat: number; lng: number } | null> {
  const isApt = propertyType === "아파트";
  const cacheKey = APICache.makeKey("geocode-v3", gu, dong, aptName, jibun || "", propertyType);
  const cached = await kvCache.get<{ lat: number; lng: number }>(cacheKey);
  if (cached) return cached;

  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!kakaoKey) return null;

  const guCenter = GU_CENTER[gu];
  const center = DONG_CENTER[dong] || guCenter;
  const regionAddress = formatRegionAddressForSearch(GU_ADDRESS_MAP[gu] || gu);
  const MAX_DISTANCE_KM = 5; // 구 중심에서 5km 이상이면 부정확한 결과로 판단

  // 아파트명 정제: 괄호/숫자 제거 (예: "신동아(22)" → "신동아")
  const cleanName = aptName.replace(/\(.*?\)/g, "").replace(/\d+$/g, "").trim();

  // ── 0단계: 지번 주소 검색 — 가장 안정적 ──
  if (jibun) {
    const addressQueries = [
      `${regionAddress} ${dong} ${jibun}`,
      `${gu} ${dong} ${jibun}`,
    ];
    for (const q of addressQueries) {
      const coord = await kakaoAddressSearch(kakaoKey, q);
      if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
        await kvCache.set(cacheKey, coord, GEOCODE_TTL);
        return coord;
      }
    }
  }

  // ── 1단계: 아파트 전용 — 카카오 키워드 검색 + AP4 카테고리 ──
  if (isApt) {
    const categoryQueries = [
      `${regionAddress} ${dong} ${cleanName}아파트`,
      `${gu} ${dong} ${cleanName}아파트`,
      `${dong} ${cleanName}아파트`,
      `${gu} ${cleanName}아파트`,
      `${cleanName}아파트`,
    ];
    for (const q of categoryQueries) {
      const coord = await kakaoKeywordSearch(kakaoKey, q, center, "AP4", true);
      if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
        await kvCache.set(cacheKey, coord, GEOCODE_TTL);
        return coord;
      }
    }
  }

  // ── 2단계: 카카오 키워드 검색 (카테고리 필터 없음, 폴백) ──
  // 비아파트 유형은 "아파트" 접미사 없이 실제 물건명으로 검색
  const fallbackQueries = isApt
    ? [
        `${regionAddress} ${dong} ${cleanName}아파트`,
        `${gu} ${dong} ${cleanName}아파트`,
        `${dong} ${cleanName}아파트`,
        `${gu} ${cleanName}`,
      ]
    : [
        `${regionAddress} ${dong} ${cleanName}`,
        `${gu} ${dong} ${cleanName}`,
        `${dong} ${cleanName}`,
        `${gu} ${cleanName}`,
        cleanName,
      ];
  for (const q of fallbackQueries) {
    const coord = await kakaoKeywordSearch(kakaoKey, q, center, undefined, isApt);
    if (coord && validateDistance(coord, center, MAX_DISTANCE_KM)) {
      await kvCache.set(cacheKey, coord, GEOCODE_TTL);
      return coord;
    }
  }

  return null;
}

// 여러 아파트 좌표를 병렬로 조회 (배치 단위 + 전체 타임아웃)
async function geocodeAll(apartments: { gu: string; dong: string; name: string; jibun?: string; propertyType?: PropertyType }[]): Promise<Map<string, { lat: number; lng: number }>> {
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
      const coord = await geocodeApt(apt.gu, apt.dong, apt.name, apt.jibun, apt.propertyType);
      if (coord) results.set(`${apt.name}@@${apt.dong}@@${apt.jibun || ""}`, coord);
    });
    await Promise.allSettled(promises);
  }
  return results;
}

// 폴백: 동 중심 좌표에 산포 (geocode 실패 시)
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
      console.error("[Price-Map] KV 삭제 실패:", err);
      return NextResponse.json({ error: "KV 삭제 실패" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "KV 미설정 — 인메모리 캐시는 서버리스 재시작 시 자동 초기화" });
}

const RESPONSE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gu = searchParams.get("gu") || "강남구";

  // 입력 검증: 허용된 구 목록에 없으면 400
  const allowedGus = [...new Set([...Object.keys(GU_ADDRESS_MAP), ...Object.keys(LAWD_CODE_MAP)])];
  if (!allowedGus.includes(gu)) {
    return NextResponse.json({ error: "지원하지 않는 지역입니다", availableGus: allowedGus }, { status: 400 });
  }

  const minPrice = parseInt(searchParams.get("minPrice") || "0");
  const maxPrice = parseInt(searchParams.get("maxPrice") || "9999999");
  const tradeType = parseTradeType(searchParams.get("type"));
  const propertyType = parsePropertyType(searchParams.get("propertyType"));
  const residentialType = toResidentialType(propertyType);

  // ── 전체 응답 KV 캐시 조회 (가격 필터 없는 요청만 캐시 적용) ──
  const useResponseCache = minPrice === 0 && maxPrice === 9999999;
  const responseCacheKey = `price-map:v6:${gu}:${propertyType}:${tradeType}`;
  if (useResponseCache) {
    const cached = await kvCache.get<object>(responseCacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  // MOLIT 실거래가 API만 사용한다. 실데이터가 없으면 빈 결과를 반환한다.
  const data: AptData[] = [];
  let dataSource: "molit" | "none" = "none";

  // 구 이름 → 법정동 코드 매핑 (LAWD_CODE_MAP에서 검색)
  const guToAddress = GU_ADDRESS_MAP[gu] || gu;
  const lawdCode = guToAddress ? LAWD_CODE_MAP[guToAddress] : undefined;

  if (lawdCode && process.env.MOLIT_API_KEY) {
    try {
      // 전세/매매 공통 처리
      const txResult = tradeType === "매매"
        ? await fetchRecentResidentialSalePrices(guToAddress, 12, residentialType)
        : await fetchRecentRentPrices(guToAddress, 12, residentialType);

      if (txResult && txResult.transactions.length > 0) {
        const transactions = tradeType === "월세"
          ? txResult.transactions.filter((tx) => "rentType" in tx && tx.rentType === "월세")
          : tradeType === "전세"
            ? txResult.transactions.filter((tx) => "rentType" in tx && tx.rentType === "전세")
            : txResult.transactions;

        // 물건명/동/지번별 그룹핑
        const grouped = new Map<string, typeof txResult.transactions[0][]>();
        for (const tx of transactions) {
          const baseName = tx.aptName || (propertyType === "다가구/단독" ? "단독/다가구" : propertyType);
          const key = `${baseName}@@${tx.dong || ""}@@${tx.jibun || ""}`;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(tx);
        }

        const entries = [...grouped.entries()];

        // 좌표 조회: KV캐시/카카오 geocode API. 좌표가 확인되지 않으면 제외한다.
        const geocoded = new Map<string, { lat: number; lng: number }>();

        // 모든 물건에 대해 정확한 geocode 시도
        const needsGeocode: { gu: string; dong: string; name: string; jibun?: string; propertyType?: PropertyType }[] = [];
        await Promise.allSettled(entries.map(async ([groupKey, txs]) => {
          const latest = txs[0];
          const [name] = groupKey.split("@@");
          const key = `${name}@@${latest.dong || ""}@@${latest.jibun || ""}`;
          const cacheKey = APICache.makeKey("geocode-v3", gu, latest.dong || "", name, latest.jibun || "", propertyType);
          const cached = await kvCache.get<{ lat: number; lng: number }>(cacheKey);
          if (cached) {
            geocoded.set(key, cached);
          } else {
            needsGeocode.push({ gu, dong: latest.dong || "", name, jibun: latest.jibun || "", propertyType });
          }
        }));

        // 2단계: 캐시 미스 아파트 → 카카오 geocode API 호출 (배치 + 타임아웃)
        if (needsGeocode.length > 0) {
          const freshCoords = await geocodeAll(needsGeocode);
          for (const [key, coord] of freshCoords) {
            geocoded.set(key, coord);
          }
        }

        entries.forEach(([groupKey, txs]) => {
          const latest = txs[0];
          const [aptNameFromKey] = groupKey.split("@@");
          const aptName = aptNameFromKey || latest.aptName || propertyType;
          const displayName = latest.jibun && (aptName === "단독/다가구" || aptName === propertyType)
            ? `${latest.dong || "주소"} ${latest.jibun}`
            : aptName;
          const amount = tradeType === "매매"
            ? (latest as { dealAmount?: number }).dealAmount || 0
            : tradeType === "전세"
              ? (latest as { deposit?: number }).deposit || 0
              : (latest as { monthlyRent?: number }).monthlyRent || 0;
          const deposit = tradeType !== "매매"
            ? (latest as { deposit?: number }).deposit || 0
            : undefined;
          const monthlyRent = tradeType === "월세"
            ? (latest as { monthlyRent?: number }).monthlyRent || 0
            : undefined;
          if (amount <= 0) return;

          const priceInMan = Math.round(amount / 10000);
          const change = calcChangeByArea(txs.map(t => ({
            amount: tradeType === "매매"
              ? ((t as { dealAmount?: number }).dealAmount || 0)
              : tradeType === "전세"
                ? ((t as { deposit?: number }).deposit || 0)
                : ((t as { monthlyRent?: number }).monthlyRent || 0),
            area: t.area || 0,
            dealYear: (t as { dealYear?: number }).dealYear || 0,
            dealMonth: (t as { dealMonth?: number }).dealMonth || 0,
          })));
          // 거래 부족(0)이면 null → 프론트에서 변동률 미표시

          // 좌표 우선순위: KV캐시 geocode → 카카오 geocode. 정확한 좌표 없으면 제외.
          const coords = geocoded.get(`${aptName}@@${latest.dong || ""}@@${latest.jibun || ""}`) || null;
          if (!coords) return; // geocode 실패 → 지도에 미표시 (가짜 좌표 방지)

          data.push({
            name: displayName,
            dong: latest.dong || "",
            price: priceInMan,
            area: latest.area ? Math.round((latest.area * 1.45) / 3.3058) : 0,
            lat: coords.lat,
            lng: coords.lng,
            change: change !== 0 ? change : null,
            year: latest.buildYear || 0,
            propertyType,
            ...(deposit !== undefined ? { deposit: Math.round(deposit / 10000) } : {}),
            ...(monthlyRent !== undefined ? { monthlyRent: Math.round(monthlyRent / 10000) } : {}),
          });
        });
        if (data.length > 0) dataSource = "molit";
      }
    } catch (err) {
      console.error("[price-map] MOLIT API 호출 실패:", err);
    }
  }

  const availableGus = Object.keys(GU_ADDRESS_MAP);

  const responsePayload = {
    gu,
    propertyType,
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

  // 전체 응답 KV 캐시 저장 (실데이터만 캐시)
  if (useResponseCache && dataSource === "molit") {
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
