/**
 * VESTRA 통계청 KOSIS API 클라이언트
 * ─────────────────────────────────────
 * 통계청 KOSIS 국가통계포털에서 인구/세대/산업/주택 통계 조회.
 * 실패 시 정적 폴백 데이터 반환.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ KOSIS_API_KEY 발급: https://kosis.kr/ → OPEN API 신청    │
 * │ (무료). .env.local에 KOSIS_API_KEY=발급받은키 추가         │
 * └──────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "../../api-cache";
import { fetchWithTimeout } from "./api-utils";

// ─── 타입 정의 ───

export interface PopulationTrend {
  year: number;
  population: number;     // 인구수
  households: number;     // 세대수
  dataSource: "live" | "fallback";
}

export interface AgeGroupPopulation {
  ageGroup: string;       // "0~4세", "5~9세", ... "85세이상"
  male: number;
  female: number;
  total: number;
}

export interface IndustryData {
  industry: string;       // 산업분류명
  establishments: number; // 사업체수
  employees: number;      // 종사자수
}

export interface HousingSupply {
  year: number;
  supplyRate: number;     // 주택보급률 (%)
  totalHousing: number;   // 주택수
  apt: number;            // 아파트
  detached: number;       // 단독주택
  rowHouse: number;       // 연립/다세대
}

export interface KOSISPopulationResult {
  region: string;
  trends: PopulationTrend[];
  ageGroups: AgeGroupPopulation[];
  dataSource: "live" | "fallback";
}

export interface KOSISIndustryResult {
  region: string;
  industries: IndustryData[];
  totalEstablishments: number;
  totalEmployees: number;
  dataSource: "live" | "fallback";
}

export interface KOSISHousingResult {
  region: string;
  trends: HousingSupply[];
  dataSource: "live" | "fallback";
}

// ─── 설정 ───

const API_BASE = "https://kosis.kr/openapi/Param/statisticsParameterData.do";
const TIMEOUT_MS = 10_000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간 (통계는 월/년 단위 갱신)

// ─── 공통 fetch 유틸 (fetchWithTimeout 활용) ───

async function kosisFetch(params: Record<string, string>): Promise<unknown | null> {
  const apiKey = process.env.KOSIS_API_KEY;
  if (!apiKey) return null;

  const searchParams = new URLSearchParams({
    method: "getList",
    apiKey,
    format: "json",
    jsonVD: "Y",
    ...params,
  });

  return fetchWithTimeout<unknown>(
    `${API_BASE}?${searchParams.toString()}`,
    { timeout: TIMEOUT_MS }
  );
}

// ─── 폴백 데이터 ───

function getFallbackPopulationTrends(region: string): PopulationTrend[] {
  // 서울 기준 기본 폴백 데이터 (최근 7년)
  const baseData: PopulationTrend[] = [
    { year: 2019, population: 9729107, households: 4148818, dataSource: "fallback" },
    { year: 2020, population: 9668465, households: 4198328, dataSource: "fallback" },
    { year: 2021, population: 9509458, households: 4267449, dataSource: "fallback" },
    { year: 2022, population: 9428372, households: 4329975, dataSource: "fallback" },
    { year: 2023, population: 9386755, households: 4387521, dataSource: "fallback" },
    { year: 2024, population: 9352480, households: 4425108, dataSource: "fallback" },
    { year: 2025, population: 9318200, households: 4462350, dataSource: "fallback" },
  ];
  return baseData;
}

function getFallbackAgeGroups(): AgeGroupPopulation[] {
  return [
    { ageGroup: "0~9세", male: 192000, female: 181000, total: 373000 },
    { ageGroup: "10~19세", male: 235000, female: 221000, total: 456000 },
    { ageGroup: "20~29세", male: 378000, female: 362000, total: 740000 },
    { ageGroup: "30~39세", male: 412000, female: 398000, total: 810000 },
    { ageGroup: "40~49세", male: 456000, female: 448000, total: 904000 },
    { ageGroup: "50~59세", male: 502000, female: 518000, total: 1020000 },
    { ageGroup: "60~69세", male: 398000, female: 425000, total: 823000 },
    { ageGroup: "70~79세", male: 218000, female: 285000, total: 503000 },
    { ageGroup: "80세이상", male: 92000, female: 178000, total: 270000 },
  ];
}

function getFallbackIndustries(): IndustryData[] {
  return [
    { industry: "도매 및 소매업", establishments: 185420, employees: 523100 },
    { industry: "숙박 및 음식점업", establishments: 142800, employees: 389200 },
    { industry: "제조업", establishments: 38500, employees: 312800 },
    { industry: "건설업", establishments: 28900, employees: 198500 },
    { industry: "부동산업", establishments: 52300, employees: 128400 },
    { industry: "전문, 과학 및 기술 서비스업", establishments: 48700, employees: 285600 },
    { industry: "정보통신업", establishments: 35200, employees: 412300 },
    { industry: "금융 및 보험업", establishments: 18900, employees: 215700 },
    { industry: "교육 서비스업", establishments: 32100, employees: 178900 },
    { industry: "보건업 및 사회복지 서비스업", establishments: 28400, employees: 245100 },
  ];
}

function getFallbackHousingSupply(): HousingSupply[] {
  return [
    { year: 2019, supplyRate: 96.2, totalHousing: 4028000, apt: 2645000, detached: 518000, rowHouse: 865000 },
    { year: 2020, supplyRate: 97.1, totalHousing: 4085000, apt: 2698000, detached: 512000, rowHouse: 875000 },
    { year: 2021, supplyRate: 97.8, totalHousing: 4138000, apt: 2748000, detached: 505000, rowHouse: 885000 },
    { year: 2022, supplyRate: 98.3, totalHousing: 4192000, apt: 2802000, detached: 498000, rowHouse: 892000 },
    { year: 2023, supplyRate: 98.9, totalHousing: 4248000, apt: 2858000, detached: 492000, rowHouse: 898000 },
    { year: 2024, supplyRate: 99.2, totalHousing: 4298000, apt: 2908000, detached: 486000, rowHouse: 904000 },
    { year: 2025, supplyRate: 99.5, totalHousing: 4342000, apt: 2952000, detached: 481000, rowHouse: 909000 },
  ];
}

// ─── API 함수 ───

/**
 * 인구수/세대수 추이 조회 (최근 7년)
 *
 * KOSIS 통계표 ID: DT_1B040A3 (주민등록인구현황)
 * @param region - 지역명 (예: "서울특별시", "강남구")
 */
export async function fetchPopulationTrends(
  region: string
): Promise<KOSISPopulationResult> {
  const cacheKey = APICache.makeKey("kosis-pop", region);
  const cached = apiCache.get<KOSISPopulationResult>(cacheKey);
  if (cached) return cached;

  if (!process.env.KOSIS_API_KEY) {
    console.warn("KOSIS_API_KEY 환경변수가 설정되지 않았습니다. 폴백 데이터를 사용합니다.");
    return {
      region,
      trends: getFallbackPopulationTrends(region),
      ageGroups: getFallbackAgeGroups(),
      dataSource: "fallback",
    };
  }

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 7;

  const data = await kosisFetch({
    orgId: "101",
    tblId: "DT_1B040A3",
    itmId: "T2+T3",             // 인구수 + 세대수
    objL1: "ALL",               // 전체 행정구역
    objL2: "ALL",
    prdSe: "Y",                 // 연간
    startPrdDe: String(startYear),
    endPrdDe: String(currentYear),
  });

  if (!data || !Array.isArray(data)) {
    return {
      region,
      trends: getFallbackPopulationTrends(region),
      ageGroups: getFallbackAgeGroups(),
      dataSource: "fallback",
    };
  }

  try {
    // KOSIS 응답 파싱: 지역명으로 필터링
    const filtered = (data as Array<Record<string, string>>).filter(
      (row) => row.C1_NM?.includes(region) || region.includes(row.C1_NM || "")
    );

    if (filtered.length === 0) {
      return {
        region,
        trends: getFallbackPopulationTrends(region),
        ageGroups: getFallbackAgeGroups(),
        dataSource: "fallback",
      };
    }

    // 연도별 그룹화
    const yearMap = new Map<number, { population: number; households: number }>();
    for (const row of filtered) {
      const year = parseInt(row.PRD_DE, 10);
      const value = parseInt(row.DT?.replace(/,/g, ""), 10) || 0;
      const existing = yearMap.get(year) || { population: 0, households: 0 };

      if (row.ITM_NM?.includes("인구")) {
        existing.population = value;
      } else if (row.ITM_NM?.includes("세대")) {
        existing.households = value;
      }
      yearMap.set(year, existing);
    }

    const trends: PopulationTrend[] = Array.from(yearMap.entries())
      .map(([year, v]) => ({
        year,
        population: v.population,
        households: v.households,
        dataSource: "live" as const,
      }))
      .sort((a, b) => a.year - b.year);

    const result: KOSISPopulationResult = {
      region,
      trends: trends.length > 0 ? trends : getFallbackPopulationTrends(region),
      ageGroups: getFallbackAgeGroups(), // 연령대는 별도 호출 필요, 일단 폴백
      dataSource: trends.length > 0 ? "live" : "fallback",
    };

    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    console.warn("KOSIS 인구 데이터 파싱 실패:", error);
    return {
      region,
      trends: getFallbackPopulationTrends(region),
      ageGroups: getFallbackAgeGroups(),
      dataSource: "fallback",
    };
  }
}

/**
 * 연령대별 인구현황 조회
 *
 * KOSIS 통계표 ID: DT_1B04005N (연령 및 성별 인구)
 * @param region - 지역명
 */
export async function fetchAgeGroupPopulation(
  region: string
): Promise<AgeGroupPopulation[]> {
  const cacheKey = APICache.makeKey("kosis-age", region);
  const cached = apiCache.get<AgeGroupPopulation[]>(cacheKey);
  if (cached) return cached;

  if (!process.env.KOSIS_API_KEY) {
    return getFallbackAgeGroups();
  }

  const currentYear = new Date().getFullYear();

  const data = await kosisFetch({
    orgId: "101",
    tblId: "DT_1B04005N",
    itmId: "T2+T3+T4",         // 계 + 남 + 여
    objL1: "ALL",
    objL2: "ALL",               // 연령대
    prdSe: "Y",
    startPrdDe: String(currentYear - 1),
    endPrdDe: String(currentYear),
  });

  if (!data || !Array.isArray(data)) {
    return getFallbackAgeGroups();
  }

  try {
    const filtered = (data as Array<Record<string, string>>).filter(
      (row) => row.C1_NM?.includes(region)
    );

    if (filtered.length === 0) return getFallbackAgeGroups();

    const ageMap = new Map<string, { male: number; female: number; total: number }>();

    for (const row of filtered) {
      const ageGroup = row.C2_NM || "";
      if (!ageGroup || ageGroup === "계") continue;

      const existing = ageMap.get(ageGroup) || { male: 0, female: 0, total: 0 };
      const value = parseInt(row.DT?.replace(/,/g, ""), 10) || 0;

      if (row.ITM_NM?.includes("남")) {
        existing.male = value;
      } else if (row.ITM_NM?.includes("여")) {
        existing.female = value;
      } else {
        existing.total = value;
      }
      ageMap.set(ageGroup, existing);
    }

    const result: AgeGroupPopulation[] = Array.from(ageMap.entries()).map(
      ([ageGroup, v]) => ({
        ageGroup,
        male: v.male,
        female: v.female,
        total: v.total || v.male + v.female,
      })
    );

    if (result.length > 0) {
      apiCache.set(cacheKey, result, CACHE_TTL);
      return result;
    }
    return getFallbackAgeGroups();
  } catch {
    return getFallbackAgeGroups();
  }
}

/**
 * 산업별 사업체수/종사자수 조회
 *
 * KOSIS 통계표 ID: DT_1K52B01 (전국사업체조사)
 * @param region - 지역명
 */
export async function fetchIndustryData(
  region: string
): Promise<KOSISIndustryResult> {
  const cacheKey = APICache.makeKey("kosis-industry", region);
  const cached = apiCache.get<KOSISIndustryResult>(cacheKey);
  if (cached) return cached;

  const fallbackIndustries = getFallbackIndustries();
  const fallbackResult: KOSISIndustryResult = {
    region,
    industries: fallbackIndustries,
    totalEstablishments: fallbackIndustries.reduce((s, i) => s + i.establishments, 0),
    totalEmployees: fallbackIndustries.reduce((s, i) => s + i.employees, 0),
    dataSource: "fallback",
  };

  if (!process.env.KOSIS_API_KEY) {
    console.warn("KOSIS_API_KEY 미설정. 산업 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  const data = await kosisFetch({
    orgId: "101",
    tblId: "DT_1K52B01",
    itmId: "T1+T2",             // 사업체수 + 종사자수
    objL1: "ALL",
    objL2: "ALL",               // 산업분류
    prdSe: "Y",
    startPrdDe: String(new Date().getFullYear() - 2),
    endPrdDe: String(new Date().getFullYear() - 1),
  });

  if (!data || !Array.isArray(data)) return fallbackResult;

  try {
    const filtered = (data as Array<Record<string, string>>).filter(
      (row) => row.C1_NM?.includes(region)
    );
    if (filtered.length === 0) return fallbackResult;

    const industryMap = new Map<string, { establishments: number; employees: number }>();

    for (const row of filtered) {
      const industry = row.C2_NM || "";
      if (!industry || industry === "전산업") continue;

      const existing = industryMap.get(industry) || { establishments: 0, employees: 0 };
      const value = parseInt(row.DT?.replace(/,/g, ""), 10) || 0;

      if (row.ITM_NM?.includes("사업체")) {
        existing.establishments = value;
      } else if (row.ITM_NM?.includes("종사자")) {
        existing.employees = value;
      }
      industryMap.set(industry, existing);
    }

    const industries: IndustryData[] = Array.from(industryMap.entries())
      .map(([industry, v]) => ({ industry, ...v }))
      .sort((a, b) => b.employees - a.employees);

    if (industries.length > 0) {
      const result: KOSISIndustryResult = {
        region,
        industries,
        totalEstablishments: industries.reduce((s, i) => s + i.establishments, 0),
        totalEmployees: industries.reduce((s, i) => s + i.employees, 0),
        dataSource: "live",
      };
      apiCache.set(cacheKey, result, CACHE_TTL);
      return result;
    }
    return fallbackResult;
  } catch {
    return fallbackResult;
  }
}

/**
 * 주택보급률/주택구성 추이 조회 (최근 7년)
 *
 * KOSIS 통계표 ID: DT_1YL20631 (주택보급률)
 * @param region - 지역명
 */
export async function fetchHousingSupply(
  region: string
): Promise<KOSISHousingResult> {
  const cacheKey = APICache.makeKey("kosis-housing", region);
  const cached = apiCache.get<KOSISHousingResult>(cacheKey);
  if (cached) return cached;

  const fallbackResult: KOSISHousingResult = {
    region,
    trends: getFallbackHousingSupply(),
    dataSource: "fallback",
  };

  if (!process.env.KOSIS_API_KEY) {
    console.warn("KOSIS_API_KEY 미설정. 주택 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  const currentYear = new Date().getFullYear();

  const data = await kosisFetch({
    orgId: "116",
    tblId: "DT_1YL20631",
    itmId: "ALL",
    objL1: "ALL",
    prdSe: "Y",
    startPrdDe: String(currentYear - 7),
    endPrdDe: String(currentYear),
  });

  if (!data || !Array.isArray(data)) return fallbackResult;

  try {
    const filtered = (data as Array<Record<string, string>>).filter(
      (row) => row.C1_NM?.includes(region)
    );
    if (filtered.length === 0) return fallbackResult;

    const yearMap = new Map<number, HousingSupply>();

    for (const row of filtered) {
      const year = parseInt(row.PRD_DE, 10);
      const value = parseFloat(row.DT?.replace(/,/g, "")) || 0;
      const existing = yearMap.get(year) || {
        year, supplyRate: 0, totalHousing: 0, apt: 0, detached: 0, rowHouse: 0,
      };

      const itemName = row.ITM_NM || "";
      if (itemName.includes("보급률")) existing.supplyRate = value;
      else if (itemName.includes("아파트")) existing.apt = value;
      else if (itemName.includes("단독")) existing.detached = value;
      else if (itemName.includes("연립") || itemName.includes("다세대")) existing.rowHouse = value;
      else if (itemName.includes("주택수") || itemName.includes("총")) existing.totalHousing = value;

      yearMap.set(year, existing);
    }

    const trends = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

    if (trends.length > 0) {
      const result: KOSISHousingResult = { region, trends, dataSource: "live" };
      apiCache.set(cacheKey, result, CACHE_TTL);
      return result;
    }
    return fallbackResult;
  } catch {
    return fallbackResult;
  }
}
