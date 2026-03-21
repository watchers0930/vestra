/**
 * VESTRA 한국은행 ECOS API 클라이언트
 * ─────────────────────────────────────
 * 한국은행 경제통계시스템(ECOS)에서 기준금리 조회.
 * 실패 시 ECONOMIC_DEFAULTS로 폴백.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ BOK_API_KEY 발급: https://ecos.bok.or.kr/ → 인증키 신청 │
 * │ (무료). .env.local에 BOK_API_KEY=발급받은키 추가         │
 * └──────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "./api-cache";

export interface BOKResponse {
  baseRate: number;
  baseRateDate: string;
  dataSource: "live" | "fallback";
}

const FALLBACK: BOKResponse = {
  baseRate: 2.75,
  baseRateDate: "2026-01-01",
  dataSource: "fallback",
};

/**
 * 한국은행 기준금리 조회
 *
 * ECOS API 통계표 722Y001 (한국은행 기준금리)
 * 캐시: 24시간 (금리는 월 1회 결정)
 */
export async function fetchBaseRate(): Promise<BOKResponse> {
  const cacheKey = APICache.makeKey("bok-base-rate");
  const cached = apiCache.get<BOKResponse>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.BOK_API_KEY;
  if (!apiKey) {
    console.warn("BOK_API_KEY 환경변수가 설정되지 않았습니다. 기본값을 사용합니다.");
    return FALLBACK;
  }

  try {
    const now = new Date();
    const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const startDate = `${now.getFullYear() - 1}${String(now.getMonth() + 1).padStart(2, "0")}`;

    // ECOS API: 통계표코드 722Y001, 항목코드 0101000 (한국은행 기준금리)
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/722Y001/M/${startDate}/${endDate}/0101000`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return FALLBACK;

    const data = await res.json();
    const rows = data?.StatisticSearch?.row;

    if (!rows || rows.length === 0) return FALLBACK;

    const latest = rows[rows.length - 1];
    const result: BOKResponse = {
      baseRate: parseFloat(latest.DATA_VALUE) || FALLBACK.baseRate,
      baseRateDate: latest.TIME || FALLBACK.baseRateDate,
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24시간 캐시
    return result;
  } catch (error) {
    console.warn("한국은행 API 조회 실패, 기본값 사용:", error);
    return FALLBACK;
  }
}
