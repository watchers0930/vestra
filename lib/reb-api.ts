/**
 * VESTRA 한국부동산원 R-ONE API 클라이언트
 * ──────────────────────────────────────────
 * 한국부동산원 부동산통계 조회 서비스(R-ONE Open API)에서
 * 매매가격지수, 전세가격지수 등 공식 시장 통계를 조회.
 *
 * 미설정 시 graceful fallback.
 */

import { apiCache, APICache } from "./api-cache";

// ─── 타입 정의 ───

export interface PriceIndex {
  period: string;       // "202601" (YYYYMM)
  value: number;        // 지수값
  changeRate?: number;  // 전월 대비 변동률 (%)
}

export interface REBMarketData {
  salePriceIndex: PriceIndex[];    // 매매가격지수
  jeonseIndex: PriceIndex[];       // 전세가격지수
  saleChangeRate: number;          // 최근 매매 변동률 (%)
  jeonseChangeRate: number;        // 최근 전세 변동률 (%)
  marketTrend: "상승" | "하락" | "보합";
  dataSource: "live" | "fallback";
}

// ─── 통계표 ID ───
// A_2024_00038: 전국 아파트 매매가격지수 (월별)
// A_2024_00042: 전국 아파트 전세가격지수 (월별)
const STAT_SALE_INDEX = "A_2024_00038";
const STAT_JEONSE_INDEX = "A_2024_00042";

const FALLBACK: REBMarketData = {
  salePriceIndex: [],
  jeonseIndex: [],
  saleChangeRate: 0,
  jeonseChangeRate: 0,
  marketTrend: "보합",
  dataSource: "fallback",
};

/**
 * R-ONE API에서 통계표 데이터 조회
 */
async function fetchStatTable(
  apiKey: string,
  statblId: string,
  startPeriod: string,
  endPeriod: string
): Promise<PriceIndex[]> {
  const url = `https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do?KEY=${apiKey}&STATBL_ID=${statblId}&DTACYCLE_CD=MM&WRTTIME_IDTFR_ID=${startPeriod}&WRTTIME_IDTFR_ID_END=${endPeriod}&Type=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) return [];

  const data = await res.json();
  const rows = data?.SttsApiTblData?.[1]?.row;
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r: Record<string, string>) => r.WRTTIME_IDTFR_ID && r.DTA_VAL)
    .map((r: Record<string, string>) => ({
      period: r.WRTTIME_IDTFR_ID,
      value: parseFloat(r.DTA_VAL) || 0,
      changeRate: r.FLUC_RT ? parseFloat(r.FLUC_RT) : undefined,
    }))
    .sort((a: PriceIndex, b: PriceIndex) => a.period.localeCompare(b.period));
}

/**
 * 한국부동산원 시장 데이터 조회
 *
 * 매매/전세 가격지수를 최근 12개월 조회.
 * 캐시: 24시간 (월별 데이터이므로 충분)
 */
export async function fetchREBMarketData(): Promise<REBMarketData> {
  const cacheKey = APICache.makeKey("reb-market-data");
  const cached = apiCache.get<REBMarketData>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.REB_API_KEY;
  if (!apiKey) {
    console.warn("REB_API_KEY 환경변수가 설정되지 않았습니다. 기본값을 사용합니다.");
    return FALLBACK;
  }

  try {
    const now = new Date();
    const endPeriod = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const startYear = now.getMonth() < 11 ? now.getFullYear() - 1 : now.getFullYear();
    const startMonth = ((now.getMonth() + 2) % 12) || 12;
    const startPeriod = `${startYear}${String(startMonth).padStart(2, "0")}`;

    const [saleIndex, jeonseIndex] = await Promise.all([
      fetchStatTable(apiKey, STAT_SALE_INDEX, startPeriod, endPeriod),
      fetchStatTable(apiKey, STAT_JEONSE_INDEX, startPeriod, endPeriod),
    ]);

    // 최근 변동률 계산
    const saleChangeRate = saleIndex.length >= 2
      ? ((saleIndex[saleIndex.length - 1].value / saleIndex[saleIndex.length - 2].value) - 1) * 100
      : 0;

    const jeonseChangeRate = jeonseIndex.length >= 2
      ? ((jeonseIndex[jeonseIndex.length - 1].value / jeonseIndex[jeonseIndex.length - 2].value) - 1) * 100
      : 0;

    // 시장 추세 판단
    let marketTrend: "상승" | "하락" | "보합" = "보합";
    if (saleChangeRate > 0.3) marketTrend = "상승";
    else if (saleChangeRate < -0.3) marketTrend = "하락";

    const result: REBMarketData = {
      salePriceIndex: saleIndex,
      jeonseIndex: jeonseIndex,
      saleChangeRate: Math.round(saleChangeRate * 100) / 100,
      jeonseChangeRate: Math.round(jeonseChangeRate * 100) / 100,
      marketTrend,
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24시간 캐시
    return result;
  } catch (error) {
    console.warn("한국부동산원 API 조회 실패, 기본값 사용:", error);
    return FALLBACK;
  }
}
