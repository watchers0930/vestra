/**
 * VESTRA 행정안전부 주민등록 API 클라이언트
 * ─────────────────────────────────────────
 * 행정안전부 주민등록 인구통계에서 인구수/세대수 및
 * 연령대별 인구 데이터를 조회.
 * KOSIS와 교차검증 또는 더 세밀한 읍면동 단위 데이터 활용.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ MOIS_API_KEY 발급: https://jumin.mois.go.kr/ → API 신청  │
 * │ (무료). .env.local에 MOIS_API_KEY=발급받은키 추가          │
 * └──────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "../../api-cache";
import { fetchWithTimeout } from "./api-utils";
import { ADMIN_CODE_MAP } from "./region-codes";

// ─── 타입 정의 ───

export interface MOISPopulation {
  year: number;
  month: number;
  region: string;           // 행정구역명
  regionCode: string;       // 행정구역코드
  population: number;       // 총인구수
  male: number;             // 남자 인구수
  female: number;           // 여자 인구수
  households: number;       // 세대수
}

export interface MOISAgeGroup {
  ageGroup: string;         // "0~4세", "5~9세", ..., "100세이상"
  male: number;
  female: number;
  total: number;
}

export interface MOISPopulationResult {
  region: string;
  trends: MOISPopulation[];
  dataSource: "live" | "fallback";
}

export interface MOISAgeResult {
  region: string;
  year: number;
  ageGroups: MOISAgeGroup[];
  medianAge: number;        // 중위연령 (추정)
  workingAgeRatio: number;  // 생산가능인구 비율 (15~64세, %)
  elderlyRatio: number;     // 고령인구 비율 (65세이상, %)
  dataSource: "live" | "fallback";
}

// ─── 설정 ───

const API_BASE = "https://jumin.mois.go.kr/openapi";
const TIMEOUT_MS = 10_000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

// ─── 행정구역코드 매핑 (region-codes.ts에서 import) ───

/**
 * 주소에서 행정구역코드 추출
 */
export function extractAdminCode(address: string): string | null {
  const normalized = address
    .replace(/특별자치시|특별자치도|특별시|광역시|도$/g, "")
    .replace(/\s+/g, "");

  const entries = Object.entries(ADMIN_CODE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, code] of entries) {
    if (normalized.includes(key)) return code;
  }
  return null;
}

// ─── 공통 fetch 유틸 (fetchWithTimeout 활용) ───

async function moisFetch(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown | null> {
  const apiKey = process.env.MOIS_API_KEY;
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

function getFallbackPopulationTrends(region: string): MOISPopulation[] {
  // 서울 기준 (최근 5년, 12월 기준)
  const trends: MOISPopulation[] = [
    { year: 2021, month: 12, region, regionCode: "", population: 9509458, male: 4630218, female: 4879240, households: 4267449 },
    { year: 2022, month: 12, region, regionCode: "", population: 9428372, male: 4590122, female: 4838250, households: 4329975 },
    { year: 2023, month: 12, region, regionCode: "", population: 9386755, male: 4568930, female: 4817825, households: 4387521 },
    { year: 2024, month: 12, region, regionCode: "", population: 9352480, male: 4548200, female: 4804280, households: 4425108 },
    { year: 2025, month: 2, region, regionCode: "", population: 9341200, male: 4542600, female: 4798600, households: 4438500 },
  ];
  return trends;
}

function getFallbackAgeGroups(): MOISAgeGroup[] {
  return [
    { ageGroup: "0~4세", male: 82000, female: 77000, total: 159000 },
    { ageGroup: "5~9세", male: 98000, female: 92000, total: 190000 },
    { ageGroup: "10~14세", male: 112000, female: 105000, total: 217000 },
    { ageGroup: "15~19세", male: 125000, female: 118000, total: 243000 },
    { ageGroup: "20~24세", male: 185000, female: 178000, total: 363000 },
    { ageGroup: "25~29세", male: 198000, female: 192000, total: 390000 },
    { ageGroup: "30~34세", male: 205000, female: 198000, total: 403000 },
    { ageGroup: "35~39세", male: 212000, female: 205000, total: 417000 },
    { ageGroup: "40~44세", male: 225000, female: 220000, total: 445000 },
    { ageGroup: "45~49세", male: 238000, female: 235000, total: 473000 },
    { ageGroup: "50~54세", male: 258000, female: 262000, total: 520000 },
    { ageGroup: "55~59세", male: 268000, female: 278000, total: 546000 },
    { ageGroup: "60~64세", male: 228000, female: 245000, total: 473000 },
    { ageGroup: "65~69세", male: 185000, female: 205000, total: 390000 },
    { ageGroup: "70~74세", male: 132000, female: 158000, total: 290000 },
    { ageGroup: "75~79세", male: 92000, female: 128000, total: 220000 },
    { ageGroup: "80~84세", male: 58000, female: 98000, total: 156000 },
    { ageGroup: "85~89세", male: 28000, female: 62000, total: 90000 },
    { ageGroup: "90~94세", male: 8000, female: 25000, total: 33000 },
    { ageGroup: "95~99세", male: 1500, female: 6500, total: 8000 },
    { ageGroup: "100세이상", male: 200, female: 800, total: 1000 },
  ];
}

// ─── API 함수 ───

/**
 * 주민등록 인구수/세대수 조회 (최근 5년)
 *
 * @param region - 지역명 (예: "서울특별시", "강남구", "서울특별시 강남구")
 */
export async function fetchMOISPopulation(
  region: string
): Promise<MOISPopulationResult> {
  const cacheKey = APICache.makeKey("mois-pop", region);
  const cached = apiCache.get<MOISPopulationResult>(cacheKey);
  if (cached) return cached;

  const fallbackResult: MOISPopulationResult = {
    region,
    trends: getFallbackPopulationTrends(region),
    dataSource: "fallback",
  };

  if (!process.env.MOIS_API_KEY) {
    console.warn("MOIS_API_KEY 미설정. 인구 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  const regionCode = extractAdminCode(region);
  if (!regionCode) {
    console.warn(`MOIS: 행정구역코드 매핑 실패 (${region}). 폴백 데이터를 사용합니다.`);
    return fallbackResult;
  }

  const currentYear = new Date().getFullYear();
  const trends: MOISPopulation[] = [];

  // 최근 5년 12월 기준 데이터 조회
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const searchMonth = year === currentYear
      ? String(new Date().getMonth()).padStart(2, "0") // 전월
      : "12";

    const data = await moisFetch("population.json", {
      regionCode,
      searchYm: `${year}${searchMonth}`,
    });

    if (data && typeof data === "object") {
      try {
        const body = (data as Record<string, unknown>).data ||
          (data as Record<string, unknown>).body ||
          (data as Record<string, unknown>).response;

        if (body && typeof body === "object") {
          const item = Array.isArray(body) ? body[0] : body;
          const rec = item as Record<string, string | number>;

          const population = Number(rec.population || rec.totPpltn || rec.totalPopulation || 0);
          const male = Number(rec.male || rec.malePpltn || rec.malePopulation || 0);
          const female = Number(rec.female || rec.femalePpltn || rec.femalePopulation || 0);
          const households = Number(rec.households || rec.houseHoldCnt || rec.totalHouseholds || 0);

          if (population > 0) {
            trends.push({
              year,
              month: parseInt(searchMonth, 10),
              region,
              regionCode,
              population,
              male,
              female,
              households,
            });
          }
        }
      } catch {
        // 파싱 실패 시 해당 연도 건너뜀
      }
    }
  }

  if (trends.length > 0) {
    const result: MOISPopulationResult = {
      region,
      trends: trends.sort((a, b) => a.year - b.year),
      dataSource: "live",
    };
    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  return fallbackResult;
}

/**
 * 연령대별 인구 조회 (5세 단위)
 *
 * @param region - 지역명
 * @param year - 조회 연도 (기본: 현재 연도)
 */
export async function fetchMOISAgePopulation(
  region: string,
  year?: number
): Promise<MOISAgeResult> {
  const targetYear = year || new Date().getFullYear();
  const cacheKey = APICache.makeKey("mois-age", region, targetYear);
  const cached = apiCache.get<MOISAgeResult>(cacheKey);
  if (cached) return cached;

  const fallbackAgeGroups = getFallbackAgeGroups();
  const fallbackResult: MOISAgeResult = {
    region,
    year: targetYear,
    ageGroups: fallbackAgeGroups,
    medianAge: calculateMedianAge(fallbackAgeGroups),
    workingAgeRatio: calculateWorkingAgeRatio(fallbackAgeGroups),
    elderlyRatio: calculateElderlyRatio(fallbackAgeGroups),
    dataSource: "fallback",
  };

  if (!process.env.MOIS_API_KEY) {
    console.warn("MOIS_API_KEY 미설정. 연령별 인구 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  const regionCode = extractAdminCode(region);
  if (!regionCode) return fallbackResult;

  const searchMonth = targetYear === new Date().getFullYear()
    ? String(new Date().getMonth()).padStart(2, "0")
    : "12";

  const data = await moisFetch("agePopulation.json", {
    regionCode,
    searchYm: `${targetYear}${searchMonth}`,
  });

  if (!data || typeof data !== "object") return fallbackResult;

  try {
    const items = ((data as Record<string, unknown>).data ||
      (data as Record<string, unknown>).body ||
      (data as Record<string, unknown>).items) as Array<Record<string, string | number>> | undefined;

    if (!items || !Array.isArray(items) || items.length === 0) return fallbackResult;

    const ageGroups: MOISAgeGroup[] = items.map((item) => {
      const ageGroup = String(item.ageGroup || item.agrde || item.age_group || "");
      const male = Number(item.male || item.malePpltn || 0);
      const female = Number(item.female || item.femalePpltn || 0);
      return {
        ageGroup,
        male,
        female,
        total: male + female,
      };
    }).filter((g) => g.ageGroup && g.total > 0);

    if (ageGroups.length === 0) return fallbackResult;

    const result: MOISAgeResult = {
      region,
      year: targetYear,
      ageGroups,
      medianAge: calculateMedianAge(ageGroups),
      workingAgeRatio: calculateWorkingAgeRatio(ageGroups),
      elderlyRatio: calculateElderlyRatio(ageGroups),
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    console.warn("MOIS 연령별 인구 파싱 실패:", error);
    return fallbackResult;
  }
}

// ─── 유틸리티 함수 ───

/**
 * 연령대별 인구에서 중위연령 추정
 */
function calculateMedianAge(ageGroups: MOISAgeGroup[]): number {
  const totalPop = ageGroups.reduce((s, g) => s + g.total, 0);
  if (totalPop === 0) return 0;

  const halfPop = totalPop / 2;
  let cumulative = 0;

  for (const group of ageGroups) {
    const startAge = parseInt(group.ageGroup, 10) || 0;
    cumulative += group.total;
    if (cumulative >= halfPop) {
      return startAge + 2; // 5세 구간 중간값
    }
  }
  return 40; // 기본값
}

/**
 * 생산가능인구 비율 (15~64세)
 */
function calculateWorkingAgeRatio(ageGroups: MOISAgeGroup[]): number {
  const totalPop = ageGroups.reduce((s, g) => s + g.total, 0);
  if (totalPop === 0) return 0;

  const workingAge = ageGroups.filter((g) => {
    const startAge = parseInt(g.ageGroup, 10) || 0;
    return startAge >= 15 && startAge < 65;
  }).reduce((s, g) => s + g.total, 0);

  return Math.round((workingAge / totalPop) * 1000) / 10;
}

/**
 * 고령인구 비율 (65세 이상)
 */
function calculateElderlyRatio(ageGroups: MOISAgeGroup[]): number {
  const totalPop = ageGroups.reduce((s, g) => s + g.total, 0);
  if (totalPop === 0) return 0;

  const elderly = ageGroups.filter((g) => {
    const startAge = parseInt(g.ageGroup, 10) || 0;
    return startAge >= 65;
  }).reduce((s, g) => s + g.total, 0);

  return Math.round((elderly / totalPop) * 1000) / 10;
}
