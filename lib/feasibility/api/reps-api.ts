/**
 * VESTRA 한국부동산원 R-ONE(REPS) API 클라이언트
 * ────────────────────────────────────────────────
 * 한국부동산원의 부동산 통계정보시스템(R-ONE)에서
 * 매매/전세 가격지수 추이를 조회.
 * 사업성 분석 시 지역 부동산 시장 동향 파악에 활용.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ REPS_API_KEY 발급: https://www.reb.or.kr/ → 오픈API 신청  │
 * │ (무료). .env.local에 REPS_API_KEY=발급받은키 추가           │
 * └──────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "../../api-cache";
import { fetchWithTimeout } from "./api-utils";
import { REGION_CODE_MAP } from "./region-codes";

// ─── 타입 정의 ───

export interface PriceIndex {
  yearMonth: string;      // "2024-01" 형식
  index: number;          // 가격지수 (2021.06 = 100 기준)
  changeRate: number;     // 전월 대비 변동률 (%)
}

export interface REPSSalePriceResult {
  region: string;
  regionCode: string;
  indices: PriceIndex[];
  latestIndex: number;
  yearOverYearChange: number; // 전년 동월 대비 변동률 (%)
  dataSource: "live" | "fallback";
}

export interface REPSRentPriceResult {
  region: string;
  regionCode: string;
  indices: PriceIndex[];
  latestIndex: number;
  yearOverYearChange: number;
  dataSource: "live" | "fallback";
}

// ─── 설정 ───

const API_BASE = "https://www.reb.or.kr/r-one/openapi";
const TIMEOUT_MS = 10_000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

// ─── 지역코드 매핑 (region-codes.ts에서 import) ───

/**
 * 주소에서 REPS 지역코드 추출
 */
export function extractRegionCode(address: string): string | null {
  const normalized = address
    .replace(/특별자치시|특별자치도|특별시|광역시|도$/g, "")
    .replace(/\s+/g, "");

  // 긴 키(구체적)부터 매칭
  const entries = Object.entries(REGION_CODE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, code] of entries) {
    if (normalized.includes(key)) return code;
  }
  return null;
}

// ─── 공통 fetch 유틸 (fetchWithTimeout 활용) ───

async function repsFetch(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown | null> {
  const apiKey = process.env.REPS_API_KEY;
  if (!apiKey) return null;

  const searchParams = new URLSearchParams({
    serviceKey: apiKey,
    format: "json",
    ...params,
  });

  return fetchWithTimeout<unknown>(
    `${API_BASE}/${endpoint}?${searchParams.toString()}`,
    { timeout: TIMEOUT_MS }
  );
}

// ─── 폴백 데이터 ───

/**
 * 매매/전세 가격지수 폴백 데이터 생성 (통합 함수)
 * @param type - "sale": 매매, "rent": 전세
 */
function getFallbackPriceIndices(type: "sale" | "rent"): PriceIndex[] {
  const base: PriceIndex[] = [];
  const startYear = 2019;
  const endYear = 2025;

  // 매매/전세별 연도 기준 지수값 및 월별 변동 계수
  const yearlyBaseMap: Record<"sale" | "rent", Record<number, number>> = {
    sale: { 2019: 88.5, 2020: 93.2, 2021: 100.8, 2022: 107.5, 2023: 102.3, 2024: 104.8, 2025: 106.2 },
    rent: { 2019: 91.2, 2020: 95.8, 2021: 100.5, 2022: 105.2, 2023: 100.8, 2024: 102.5, 2025: 103.8 },
  };
  const monthVariationFactor = type === "sale" ? 0.08 : 0.06;
  const yearlyBase = yearlyBaseMap[type];

  for (let year = startYear; year <= endYear; year++) {
    const monthEnd = year === endYear ? 2 : 12; // 현재년도는 2월까지
    for (let month = 1; month <= monthEnd; month++) {
      const baseIdx = yearlyBase[year] || 100;
      const monthVariation = (month - 6) * monthVariationFactor;
      const index = Math.round((baseIdx + monthVariation) * 100) / 100;

      const prevIndex = base.length > 0 ? base[base.length - 1].index : index;
      const changeRate = Math.round(((index - prevIndex) / prevIndex) * 10000) / 100;

      base.push({
        yearMonth: `${year}-${String(month).padStart(2, "0")}`,
        index,
        changeRate: base.length > 0 ? changeRate : 0,
      });
    }
  }
  return base;
}

// ─── API 함수 ───

/**
 * 매매가격지수 추이 조회 (최근 7년, 월별)
 *
 * @param region - 지역명 (예: "서울", "강남구", "전국")
 */
export async function fetchSalePriceIndex(
  region: string
): Promise<REPSSalePriceResult> {
  const regionCode = extractRegionCode(region);
  const cacheKey = APICache.makeKey("reps-sale", region);
  const cached = apiCache.get<REPSSalePriceResult>(cacheKey);
  if (cached) return cached;

  const fallbackIndices = getFallbackPriceIndices("sale");
  const fallbackResult: REPSSalePriceResult = {
    region,
    regionCode: regionCode || "0000000000",
    indices: fallbackIndices,
    latestIndex: fallbackIndices[fallbackIndices.length - 1]?.index || 100,
    yearOverYearChange: 1.3,
    dataSource: "fallback",
  };

  if (!process.env.REPS_API_KEY) {
    console.warn("REPS_API_KEY 미설정. 매매지수 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  if (!regionCode) {
    console.warn(`REPS: 지역코드 매핑 실패 (${region}). 폴백 데이터를 사용합니다.`);
    return fallbackResult;
  }

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear - 7}01`;
  const endDate = `${currentYear}${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const data = await repsFetch("salePriceIndex.json", {
    regionCode,
    startDate,
    endDate,
    housingType: "01",  // 아파트
  });

  if (!data || typeof data !== "object") return fallbackResult;

  try {
    const items = ((data as Record<string, unknown>).data ||
      (data as Record<string, unknown>).body ||
      (data as Record<string, unknown>).items) as Array<Record<string, string>> | undefined;

    if (!items || !Array.isArray(items) || items.length === 0) return fallbackResult;

    const indices: PriceIndex[] = items.map((item, idx) => {
      const yearMonth = item.DEAL_YM || item.dealYm || item.ym || "";
      const formatted = yearMonth.length === 6
        ? `${yearMonth.slice(0, 4)}-${yearMonth.slice(4, 6)}`
        : yearMonth;
      const index = parseFloat(item.INDEX || item.index || item.idx || "0");
      const prevIndex = idx > 0
        ? parseFloat(items[idx - 1].INDEX || items[idx - 1].index || items[idx - 1].idx || "0")
        : index;
      const changeRate = prevIndex > 0
        ? Math.round(((index - prevIndex) / prevIndex) * 10000) / 100
        : 0;

      return { yearMonth: formatted, index, changeRate };
    });

    if (indices.length === 0) return fallbackResult;

    const latestIndex = indices[indices.length - 1].index;
    // 전년 동월 대비 변동률
    const yearAgoIdx = indices.length > 12 ? indices[indices.length - 13].index : indices[0].index;
    const yearOverYearChange = yearAgoIdx > 0
      ? Math.round(((latestIndex - yearAgoIdx) / yearAgoIdx) * 1000) / 10
      : 0;

    const result: REPSSalePriceResult = {
      region,
      regionCode,
      indices,
      latestIndex,
      yearOverYearChange,
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    console.warn("REPS 매매지수 파싱 실패:", error);
    return fallbackResult;
  }
}

/**
 * 전세가격지수 추이 조회 (최근 7년, 월별)
 *
 * @param region - 지역명
 */
export async function fetchRentPriceIndex(
  region: string
): Promise<REPSRentPriceResult> {
  const regionCode = extractRegionCode(region);
  const cacheKey = APICache.makeKey("reps-rent", region);
  const cached = apiCache.get<REPSRentPriceResult>(cacheKey);
  if (cached) return cached;

  const fallbackIndices = getFallbackPriceIndices("rent");
  const fallbackResult: REPSRentPriceResult = {
    region,
    regionCode: regionCode || "0000000000",
    indices: fallbackIndices,
    latestIndex: fallbackIndices[fallbackIndices.length - 1]?.index || 100,
    yearOverYearChange: 1.0,
    dataSource: "fallback",
  };

  if (!process.env.REPS_API_KEY) {
    console.warn("REPS_API_KEY 미설정. 전세지수 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  if (!regionCode) {
    console.warn(`REPS: 지역코드 매핑 실패 (${region}). 폴백 데이터를 사용합니다.`);
    return fallbackResult;
  }

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear - 7}01`;
  const endDate = `${currentYear}${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const data = await repsFetch("rentPriceIndex.json", {
    regionCode,
    startDate,
    endDate,
    housingType: "01",
  });

  if (!data || typeof data !== "object") return fallbackResult;

  try {
    const items = ((data as Record<string, unknown>).data ||
      (data as Record<string, unknown>).body ||
      (data as Record<string, unknown>).items) as Array<Record<string, string>> | undefined;

    if (!items || !Array.isArray(items) || items.length === 0) return fallbackResult;

    const indices: PriceIndex[] = items.map((item, idx) => {
      const yearMonth = item.DEAL_YM || item.dealYm || item.ym || "";
      const formatted = yearMonth.length === 6
        ? `${yearMonth.slice(0, 4)}-${yearMonth.slice(4, 6)}`
        : yearMonth;
      const index = parseFloat(item.INDEX || item.index || item.idx || "0");
      const prevIndex = idx > 0
        ? parseFloat(items[idx - 1].INDEX || items[idx - 1].index || items[idx - 1].idx || "0")
        : index;
      const changeRate = prevIndex > 0
        ? Math.round(((index - prevIndex) / prevIndex) * 10000) / 100
        : 0;

      return { yearMonth: formatted, index, changeRate };
    });

    if (indices.length === 0) return fallbackResult;

    const latestIndex = indices[indices.length - 1].index;
    const yearAgoIdx = indices.length > 12 ? indices[indices.length - 13].index : indices[0].index;
    const yearOverYearChange = yearAgoIdx > 0
      ? Math.round(((latestIndex - yearAgoIdx) / yearAgoIdx) * 1000) / 10
      : 0;

    const result: REPSRentPriceResult = {
      region,
      regionCode,
      indices,
      latestIndex,
      yearOverYearChange,
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    console.warn("REPS 전세지수 파싱 실패:", error);
    return fallbackResult;
  }
}
