/**
 * VESTRA 입주물량 데이터 모듈
 * ──────────────────────────────
 * 지역별 입주예정물량 조회.
 * 공공데이터 API 또는 정적 데이터 기반.
 * 실패 시 null 반환 (선택적 데이터).
 */

import { apiCache, APICache } from "./api-cache";

export interface SupplyData {
  region: string;
  volume12m: number;       // 향후 12개월 입주물량
  volumeAvg5y: number;     // 최근 5년 연평균
  supplyRatio: number;     // 입주물량/연평균 비율
  dataSource: "estimate" | "static";
}

/**
 * 주요 지역 입주물량 추정 데이터 (2026년 기준)
 * 실제 운영 시에는 공공데이터 API로 대체 가능
 */
const SUPPLY_ESTIMATES: Record<string, { volume12m: number; avg5y: number }> = {
  "서울": { volume12m: 32000, avg5y: 38000 },
  "강남구": { volume12m: 2800, avg5y: 3200 },
  "서초구": { volume12m: 2200, avg5y: 2600 },
  "송파구": { volume12m: 3500, avg5y: 3800 },
  "마포구": { volume12m: 2000, avg5y: 2400 },
  "용산구": { volume12m: 1800, avg5y: 2000 },
  "성동구": { volume12m: 1500, avg5y: 1800 },
  "영등포구": { volume12m: 2800, avg5y: 3000 },
  "경기": { volume12m: 95000, avg5y: 85000 },
  "인천": { volume12m: 35000, avg5y: 30000 },
  "부산": { volume12m: 28000, avg5y: 25000 },
  "대구": { volume12m: 22000, avg5y: 20000 },
  "대전": { volume12m: 12000, avg5y: 11000 },
  "광주": { volume12m: 10000, avg5y: 9000 },
  "세종": { volume12m: 15000, avg5y: 12000 },
};

/**
 * 주소에서 지역 키워드 추출
 */
function extractRegionKey(address: string): string | null {
  // 구 단위 매칭 (서울 내)
  const guMatch = address.match(/(강남구|서초구|송파구|마포구|용산구|성동구|영등포구)/);
  if (guMatch) return guMatch[1];

  // 광역시/도 단위 매칭
  if (address.includes("서울")) return "서울";
  if (address.includes("경기")) return "경기";
  if (address.includes("인천")) return "인천";
  if (address.includes("부산")) return "부산";
  if (address.includes("대구")) return "대구";
  if (address.includes("대전")) return "대전";
  if (address.includes("광주")) return "광주";
  if (address.includes("세종")) return "세종";

  return null;
}

/**
 * 지역별 입주물량 조회
 *
 * @param address - 부동산 주소
 * @returns 입주물량 데이터 또는 null
 */
export async function fetchSupplyVolume(address: string): Promise<SupplyData | null> {
  const cacheKey = APICache.makeKey("supply", address);
  const cached = apiCache.get<SupplyData>(cacheKey);
  if (cached) return cached;

  const regionKey = extractRegionKey(address);
  if (!regionKey) return null;

  const estimate = SUPPLY_ESTIMATES[regionKey];
  if (!estimate) return null;

  const result: SupplyData = {
    region: regionKey,
    volume12m: estimate.volume12m,
    volumeAvg5y: estimate.avg5y,
    supplyRatio: Math.round((estimate.volume12m / estimate.avg5y) * 100) / 100,
    dataSource: "estimate",
  };

  apiCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 7일 캐시
  return result;
}
