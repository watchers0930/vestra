/**
 * 국토교통부 실거래가 API — 전월세 실거래 (아파트/연립다세대/단독다가구/오피스텔)
 */
import { apiCache, APICache } from "../api-cache";
import { molitFetch, parseRentTransactions, filterTransactions, MOLIT_ENDPOINTS } from "./molit-data";
import type { RentTransaction, RentPriceResult, ResidentialRentType } from "./types";
import { extractLawdCode, extractAddressFilters, batchFetch } from "./address-utils";

/** 아파트 전월세 실거래 API 호출 */
export async function fetchAptRentTransactions(
  lawdCd: string,
  dealYmd: string
): Promise<RentTransaction[]> {
  // 아파트 전월세 전용 키 우선, 없으면 기본 MOLIT 키 사용
  const serviceKey = process.env.MOLIT_APT_RENT_KEY || process.env.MOLIT_API_KEY;
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
