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

// ─── 지역코드 매핑 ───

const REGION_CODE_MAP: Record<string, string> = {
  // 전국
  "전국": "0000000000",
  // 서울
  "서울": "1100000000", "서울특별시": "1100000000",
  "강남구": "1168000000", "서초구": "1165000000", "송파구": "1171000000",
  "강동구": "1174000000", "마포구": "1144000000", "용산구": "1117000000",
  "성동구": "1120000000", "광진구": "1121500000", "영등포구": "1156000000",
  "노원구": "1135000000", "강서구": "1150000000", "구로구": "1153000000",
  // 경기
  "경기": "4100000000", "경기도": "4100000000",
  "수원": "4111000000", "성남": "4113000000", "분당": "4113500000",
  "용인": "4146000000", "화성": "4159000000", "고양": "4128000000",
  "남양주": "4136000000", "파주": "4148000000",
  // 부산
  "부산": "2600000000", "부산광역시": "2600000000",
  "해운대구": "2635000000", "수영구": "2650000000",
  // 대구
  "대구": "2700000000", "수성구": "2726000000",
  // 인천
  "인천": "2800000000", "연수구": "2818500000",
  // 광주
  "광주": "2900000000",
  // 대전
  "대전": "3000000000", "유성구": "3020000000",
  // 울산
  "울산": "3100000000",
  // 세종
  "세종": "3611000000",
  // 제주
  "제주": "5000000000",
};

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

// ─── 공통 fetch 유틸 ───

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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/${endpoint}?${searchParams.toString()}`, {
      signal: controller.signal,
      headers: { "User-Agent": "VESTRA/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn("REPS API 호출 실패:", error);
    return null;
  }
}

// ─── 폴백 데이터 ───

function getFallbackSalePriceIndices(): PriceIndex[] {
  // 전국 아파트 매매가격지수 (2021.06=100 기준, 월별)
  const base: PriceIndex[] = [];
  const startYear = 2019;
  const endYear = 2025;

  // 연도별 기준 지수값 (대략적 전국 추세)
  const yearlyBase: Record<number, number> = {
    2019: 88.5, 2020: 93.2, 2021: 100.8,
    2022: 107.5, 2023: 102.3, 2024: 104.8, 2025: 106.2,
  };

  for (let year = startYear; year <= endYear; year++) {
    const monthEnd = year === endYear ? 2 : 12; // 현재년도는 2월까지
    for (let month = 1; month <= monthEnd; month++) {
      const baseIdx = yearlyBase[year] || 100;
      // 월별 미세 변동 (-0.5% ~ +0.5%)
      const monthVariation = (month - 6) * 0.08;
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

function getFallbackRentPriceIndices(): PriceIndex[] {
  const base: PriceIndex[] = [];
  const startYear = 2019;
  const endYear = 2025;

  const yearlyBase: Record<number, number> = {
    2019: 91.2, 2020: 95.8, 2021: 100.5,
    2022: 105.2, 2023: 100.8, 2024: 102.5, 2025: 103.8,
  };

  for (let year = startYear; year <= endYear; year++) {
    const monthEnd = year === endYear ? 2 : 12;
    for (let month = 1; month <= monthEnd; month++) {
      const baseIdx = yearlyBase[year] || 100;
      const monthVariation = (month - 6) * 0.06;
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

  const fallbackIndices = getFallbackSalePriceIndices();
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

  const fallbackIndices = getFallbackRentPriceIndices();
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
