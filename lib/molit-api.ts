/**
 * VESTRA 국토교통부 실거래가 API 클라이언트
 * ─────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 국토교통부 아파트 실거래가 API를 호출.
 * XML 응답을 파싱하여 구조화된 거래 데이터로 변환.
 */

import { apiCache, APICache } from "./api-cache";
import {
  LAWD_CODE_MAP, molitFetch, parseTransactions, parseRentTransactions,
  filterTransactions, extractXmlValue, extractVal, MOLIT_ENDPOINTS,
} from "./molit/molit-data";

// ─── re-export (기존 import 경로 유지) ───

export {
  LAWD_CODE_MAP, molitFetch, parseTransactions, parseRentTransactions,
  filterTransactions, extractXmlValue, extractVal, MOLIT_ENDPOINTS,
} from "./molit/molit-data";

// ─── 타입 정의 ───

export interface RealTransaction {
  dealAmount: number;    // 거래금액 (원 단위)
  buildYear: number;     // 건축년도
  dealYear: number;      // 거래년도
  dealMonth: number;     // 거래월
  dealDay: number;       // 거래일
  aptName: string;       // 아파트명
  area: number;          // 전용면적 (㎡)
  floor: number;         // 층
  dong: string;          // 법정동
  jibun?: string;        // 지번
}

export interface PriceResult {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  transactions: RealTransaction[];
  period: string;
  filterLevel?: "dong_apt" | "dong" | "apt" | "none";
  totalBeforeFilter?: number;
}

export interface RentTransaction {
  deposit: number;       // 보증금 (원 단위)
  monthlyRent: number;   // 월세 (원 단위, 전세면 0)
  rentType: string;      // 전세/월세
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
  jibun?: string;
}

export interface RentPriceResult {
  avgDeposit: number;
  minDeposit: number;
  maxDeposit: number;
  jeonseCount: number;   // 전세 건수
  wolseCount: number;    // 월세 건수
  transactions: RentTransaction[];
  period: string;
}

export interface ComprehensivePriceResult {
  sale: PriceResult | null;
  rent: RentPriceResult | null;
  jeonseRatio: number | null;  // 실데이터 기반 전세가율 (%)
}

export type ResidentialSaleType = "apartment" | "rowhouse" | "singlehouse" | "officetel";
export type ResidentialRentType = ResidentialSaleType;

// ─── 주소 유틸 ───

/**
 * 주소에서 법정동 코드 추출
 *
 * 매칭 전략:
 * 1. 주소에서 "특별시", "광역시" 등 행정 접미사와 공백을 제거하여 정규화
 * 2. 키를 길이 내림차순 정렬하여 가장 구체적인 매칭을 우선 적용
 */
export function extractLawdCode(address: string): string | null {
  const normalized = address
    .replace(/특별자치시|특별자치도|특별시|광역시/g, "")
    .replace(/\s+/g, "");

  const entries = Object.entries(LAWD_CODE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, code] of entries) {
    if (normalized.includes(key)) return code;
  }

  return null;
}

/**
 * 주소에서 법정동(읍/면/리) 및 아파트명 힌트를 추출
 */
export function extractAddressFilters(address: string): {
  dong: string | null;
  aptHint: string | null;
} {
  const tokens = address.trim().split(/\s+/);

  let dong: string | null = null;
  let aptHintTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^.{1,10}[동읍면리가]$/.test(t) && !/[시도구군]$/.test(t.slice(0, -1))) {
      if (!/구$|시$|군$|도$/.test(t)) {
        dong = t;
        aptHintTokens = tokens.slice(i + 1).filter(
          (s) => !/^\d+[-\d]*$/.test(s) && s.length >= 2
        );
      }
    }
  }

  if (!dong) {
    const dongToken = tokens.find(
      (t) => /동$/.test(t) && t.length >= 2 && t.length <= 10 && !/구$|시$/.test(t.slice(0, -1))
    );
    if (dongToken) {
      dong = dongToken;
      const idx = tokens.indexOf(dongToken);
      aptHintTokens = tokens.slice(idx + 1).filter(
        (s) => !/^\d+[-\d]*$/.test(s) && s.length >= 2
      );
    }
  }

  const aptHint = aptHintTokens.length > 0 ? aptHintTokens.join(" ") : null;

  return { dong, aptHint };
}

// ─── 배치 병렬 처리 ───

/** 배치 병렬 처리 — API 과부하 방지 (6개월씩 배치) */
async function batchFetch<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = 6
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

// ─── 매매 실거래 ───

/**
 * 국토교통부 실거래가 API 호출
 */
export async function fetchRealTransactions(
  lawdCd: string,
  dealYmd: string
): Promise<RealTransaction[]> {
  const cacheKey = APICache.makeKey("molit-trade", lawdCd, dealYmd);
  const cached = apiCache.get<RealTransaction[]>(cacheKey);
  if (cached) return cached;

  const serviceKey = process.env.MOLIT_API_KEY;

  if (!serviceKey) {
    console.warn("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");
    return [];
  }

  const baseUrl =
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
  if (!xml) return [];
  const result = parseTransactions(xml);
  apiCache.set(cacheKey, result, 30 * 60 * 1000); // 30분
  return result;
}

/**
 * 특정 주소의 최근 실거래가 조회
 */
export async function fetchRecentPrices(
  address: string,
  months: number = 12
): Promise<PriceResult | null> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const { dong, aptHint } = extractAddressFilters(address);

  const now = new Date();

  const tasks = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return () => fetchRealTransactions(lawdCd, dealYmd);
  });
  const results = await batchFetch(tasks);
  const allTransactions = results.flat();

  const { filtered, filterLevel } = filterTransactions(allTransactions, dong, aptHint);

  if (filtered.length === 0) {
    return {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      transactionCount: 0,
      transactions: [],
      period: `최근 ${months}개월`,
      filterLevel,
      totalBeforeFilter: allTransactions.length,
    } as PriceResult;
  }

  const prices = filtered.map((t) => t.dealAmount);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    avgPrice,
    minPrice,
    maxPrice,
    transactionCount: filtered.length,
    transactions: filtered.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
    ),
    period: `최근 ${months}개월`,
    filterLevel,
    totalBeforeFilter: allTransactions.length,
  } as PriceResult;
}

// ─── 전월세 실거래 ───

/** 아파트 전월세 실거래 API 호출 */
export async function fetchAptRentTransactions(
  lawdCd: string,
  dealYmd: string
): Promise<RentTransaction[]> {
  const serviceKey = process.env.KAPT_API_KEY || process.env.MOLIT_API_KEY;
  if (!serviceKey) return [];

  const baseUrl = MOLIT_ENDPOINTS.aptRent;

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
  if (!xml) return [];
  return parseRentTransactions(xml);
}

function endpointForResidentialRent(type: ResidentialRentType): {
  endpoint: string;
  cachePrefix: string;
} {
  if (type === "rowhouse") {
    return {
      endpoint: MOLIT_ENDPOINTS.rowHouseRent,
      cachePrefix: "molit-rowhouse-rent",
    };
  }
  if (type === "singlehouse") {
    return {
      endpoint: MOLIT_ENDPOINTS.singleHouseRent,
      cachePrefix: "molit-singlehouse-rent",
    };
  }
  if (type === "officetel") {
    return {
      endpoint: MOLIT_ENDPOINTS.officeTelRent,
      cachePrefix: "molit-officetel-rent",
    };
  }
  return {
    endpoint: MOLIT_ENDPOINTS.aptRent,
    cachePrefix: "molit-apt-rent",
  };
}

export async function fetchResidentialRentTransactions(
  type: ResidentialRentType,
  lawdCd: string,
  dealYmd: string
): Promise<RentTransaction[]> {
  if (type === "apartment") return fetchAptRentTransactions(lawdCd, dealYmd);

  const serviceKey = process.env.KAPT_API_KEY || process.env.MOLIT_API_KEY;
  if (!serviceKey) return [];

  const { endpoint, cachePrefix } = endpointForResidentialRent(type);
  const cacheKey = APICache.makeKey(cachePrefix, lawdCd, dealYmd);
  const cached = apiCache.get<RentTransaction[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${endpoint}?${params.toString()}`);
  if (!xml) return [];

  const result = parseRentTransactions(xml);
  apiCache.set(cacheKey, result, 30 * 60 * 1000);
  return result;
}

/** 최근 전월세 실거래 조회 */
export async function fetchRecentRentPrices(
  address: string,
  months: number = 12,
  type: ResidentialRentType = "apartment"
): Promise<RentPriceResult | null> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const { dong, aptHint } = extractAddressFilters(address);

  const now = new Date();
  const tasks = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return () => fetchResidentialRentTransactions(type, lawdCd, dealYmd);
  });
  const results = await batchFetch(tasks);
  const allTransactions = results.flat();

  const { filtered } = filterTransactions(allTransactions, dong, aptHint);

  const jeonseOnly = filtered.filter((t) => t.rentType === "전세");
  const wolseOnly = filtered.filter((t) => t.rentType === "월세");

  if (jeonseOnly.length === 0 && wolseOnly.length === 0) {
    return {
      avgDeposit: 0, minDeposit: 0, maxDeposit: 0,
      jeonseCount: 0, wolseCount: 0,
      transactions: [], period: `최근 ${months}개월`,
    };
  }

  const deposits = jeonseOnly.map((t) => t.deposit);
  const avgDeposit = deposits.length > 0
    ? Math.round(deposits.reduce((a, b) => a + b, 0) / deposits.length)
    : 0;

  return {
    avgDeposit,
    minDeposit: deposits.length > 0 ? Math.min(...deposits) : 0,
    maxDeposit: deposits.length > 0 ? Math.max(...deposits) : 0,
    jeonseCount: jeonseOnly.length,
    wolseCount: wolseOnly.length,
    transactions: filtered.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
    ),
    period: `최근 ${months}개월`,
  };
}

// ─── 연립다세대/단독다가구/오피스텔 매매 ───

/** 범용 매매 실거래 API 호출 (엔드포인트 지정, 영문/한글 태그 호환) */
export async function fetchGenericSaleTransactions(
  endpoint: string,
  nameTag: string,
  lawdCd: string,
  dealYmd: string,
  fallbackName: string = ""
): Promise<RealTransaction[]> {
  const serviceKey = process.env.KAPT_API_KEY || process.env.MOLIT_API_KEY;
  if (!serviceKey) return [];

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${endpoint}?${params.toString()}`);
  if (!xml) return [];

  const items: RealTransaction[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const amtRaw = extractVal(item, "dealAmount", "거래금액").replace(/,/g, "");
    const amt = parseInt(amtRaw, 10) * 10000;
    if (isNaN(amt) || amt <= 0) continue;
    items.push({
      dealAmount: amt,
      buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
      dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
      dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
      dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
      aptName:
        extractXmlValue(item, nameTag) ||
        extractVal(item, "aptNm", "아파트") ||
        extractXmlValue(item, "단지명") ||
        extractVal(item, "houseType", "주택유형") ||
        extractXmlValue(item, "연립다세대") ||
        fallbackName,
      area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || parseFloat(extractXmlValue(item, "연면적")) || 0,
      floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
      dong: extractVal(item, "umdNm", "법정동"),
      jibun: extractVal(item, "jibun", "지번"),
    });
  }
  return items;
}

function endpointForResidentialSale(type: ResidentialSaleType): {
  endpoint: string;
  nameTag: string;
  cachePrefix: string;
  fallbackName: string;
} {
  if (type === "rowhouse") {
    return {
      endpoint: MOLIT_ENDPOINTS.rowHouseTrade,
      nameTag: "연립다세대",
      cachePrefix: "molit-rowhouse-trade",
      fallbackName: "연립/다세대",
    };
  }
  if (type === "singlehouse") {
    return {
      endpoint: MOLIT_ENDPOINTS.singleHouseTrade,
      nameTag: "주택유형",
      cachePrefix: "molit-singlehouse-trade",
      fallbackName: "단독/다가구",
    };
  }
  if (type === "officetel") {
    return {
      endpoint: MOLIT_ENDPOINTS.officeTelTrade,
      nameTag: "단지명",
      cachePrefix: "molit-officetel-trade",
      fallbackName: "오피스텔",
    };
  }
  return {
    endpoint: MOLIT_ENDPOINTS.aptTrade,
    nameTag: "아파트",
    cachePrefix: "molit-trade",
    fallbackName: "아파트",
  };
}

export async function fetchResidentialSaleTransactions(
  type: ResidentialSaleType,
  lawdCd: string,
  dealYmd: string
): Promise<RealTransaction[]> {
  if (type === "apartment") return fetchRealTransactions(lawdCd, dealYmd);

  const { endpoint, nameTag, cachePrefix, fallbackName } = endpointForResidentialSale(type);
  const cacheKey = APICache.makeKey(cachePrefix, lawdCd, dealYmd);
  const cached = apiCache.get<RealTransaction[]>(cacheKey);
  if (cached) return cached;

  const result = await fetchGenericSaleTransactions(endpoint, nameTag, lawdCd, dealYmd, fallbackName);
  apiCache.set(cacheKey, result, 30 * 60 * 1000);
  return result;
}

export async function fetchRecentResidentialSalePrices(
  address: string,
  months: number = 12,
  type: ResidentialSaleType = "apartment"
): Promise<PriceResult | null> {
  if (type === "apartment") return fetchRecentPrices(address, months);

  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const { dong } = extractAddressFilters(address);
  const now = new Date();
  const tasks = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return () => fetchResidentialSaleTransactions(type, lawdCd, dealYmd);
  });
  const results = await batchFetch(tasks);
  const allTransactions = results.flat();
  const { filtered, filterLevel } = filterTransactions(allTransactions, dong, null);

  if (filtered.length === 0) {
    return {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      transactionCount: 0,
      transactions: [],
      period: `최근 ${months}개월`,
      filterLevel,
      totalBeforeFilter: allTransactions.length,
    };
  }

  const prices = filtered.map((t) => t.dealAmount);
  return {
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    transactionCount: filtered.length,
    transactions: filtered.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
    ),
    period: `최근 ${months}개월`,
    filterLevel,
    totalBeforeFilter: allTransactions.length,
  };
}

// ─── 종합 시세 조회 ───

/**
 * 종합 시세 조회 (매매 + 전월세, 아파트 + 연립 + 단독 + 오피스텔)
 */
export async function fetchComprehensivePrices(
  address: string,
  months: number = 12
): Promise<ComprehensivePriceResult> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return { sale: null, rent: null, jeonseRatio: null };

  const now = new Date();
  const dealYmds = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [saleResult, rentResult] = await Promise.all([
    fetchRecentPrices(address, months),
    fetchRecentRentPrices(address, months),
  ]);

  let sale = saleResult;
  if (!sale || sale.transactionCount < 3) {
    const extraPromises = dealYmds.slice(0, 3).flatMap((ymd) => [
      fetchGenericSaleTransactions(MOLIT_ENDPOINTS.rowHouseTrade, "연립다세대", lawdCd, ymd),
      fetchGenericSaleTransactions(MOLIT_ENDPOINTS.officeTelTrade, "단지명", lawdCd, ymd),
    ]);
    const extraResults = (await Promise.all(extraPromises)).flat();

    if (extraResults.length > 0) {
      const existing = sale?.transactions ?? [];
      const all = [...existing, ...extraResults];
      const prices = all.map((t) => t.dealAmount);
      sale = {
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        transactionCount: all.length,
        transactions: all.sort(
          (a, b) =>
            b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
            (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
        ),
        period: `최근 ${months}개월 (종합)`,
      };
    }
  }

  let jeonseRatio: number | null = null;
  if (sale && sale.avgPrice > 0 && rentResult && rentResult.avgDeposit > 0) {
    jeonseRatio = Math.round((rentResult.avgDeposit / sale.avgPrice) * 1000) / 10;
  }

  return { sale, rent: rentResult, jeonseRatio };
}
