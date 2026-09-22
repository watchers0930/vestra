/**
 * 국토교통부 실거래가 API — 매매 실거래 (아파트/연립다세대/단독다가구/오피스텔)
 */
import { apiCache, APICache } from "../api-cache";
import {
  molitFetch, molitFetchRtms, parseTransactions, filterTransactions,
  extractXmlValue, extractVal, MOLIT_ENDPOINTS,
} from "./molit-data";
import type { RealTransaction, PriceResult, ResidentialSaleType } from "./types";
import { extractLawdCode, extractAddressFilters, batchFetch } from "./address-utils";

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

/** 범용 매매 실거래 API 호출 (엔드포인트 지정, 영문/한글 태그 호환) */
export async function fetchGenericSaleTransactions(
  endpoint: string,
  nameTag: string,
  lawdCd: string,
  dealYmd: string,
  fallbackName: string = ""
): Promise<RealTransaction[]> {
  // 연립/오피스텔/단독 매매는 두 계정(KAPT·MOLIT)에 활용신청이 갈릴 수 있어
  // KAPT키 우선 시도 후 "미구독"이면 MOLIT키로 폴백한다(molitFetchRtms가 미구독 감지·메모이제이션 담당).
  const xml = await molitFetchRtms(
    endpoint,
    [process.env.KAPT_API_KEY, process.env.MOLIT_API_KEY],
    lawdCd,
    dealYmd,
  );
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
      area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || parseFloat(extractXmlValue(item, "연면적")) || parseFloat(extractXmlValue(item, "계약면적")) || 0,
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
