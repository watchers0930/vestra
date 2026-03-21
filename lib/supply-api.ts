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
 *
 * volume12m: 향후 12개월 입주물량 (세대)
 * avg5y: 최근 5년 연평균 입주물량 (세대)
 * supplyRatio = volume12m / avg5y
 */
const SUPPLY_ESTIMATES: Record<string, { volume12m: number; avg5y: number }> = {
  // ── 서울 및 서울 자치구 ──
  "서울": { volume12m: 29500, avg5y: 36000 },
  "강남구": { volume12m: 2500, avg5y: 3100 },
  "서초구": { volume12m: 2000, avg5y: 2500 },
  "송파구": { volume12m: 3200, avg5y: 3600 },
  "마포구": { volume12m: 1800, avg5y: 2300 },
  "용산구": { volume12m: 1600, avg5y: 1900 },
  "성동구": { volume12m: 1400, avg5y: 1700 },
  "영등포구": { volume12m: 2600, avg5y: 2800 },

  // ── 광역시/도 ──
  "경기": { volume12m: 102000, avg5y: 88000 },
  "인천": { volume12m: 38000, avg5y: 32000 },
  "부산": { volume12m: 26000, avg5y: 24000 },
  "대구": { volume12m: 20000, avg5y: 19000 },
  "대전": { volume12m: 11500, avg5y: 10500 },
  "광주": { volume12m: 9500, avg5y: 8800 },
  "세종": { volume12m: 13000, avg5y: 11000 },

  // ── 경기 주요 시 ──
  "수원": { volume12m: 12500, avg5y: 10800 },
  "용인": { volume12m: 14200, avg5y: 11500 },
  "성남": { volume12m: 8800, avg5y: 7200 },
  "고양": { volume12m: 9500, avg5y: 8000 },
  "화성": { volume12m: 18500, avg5y: 14000 },

  // ── 충청/전라/경상/제주 주요 시 ──
  "청주": { volume12m: 8200, avg5y: 7000 },
  "천안": { volume12m: 9800, avg5y: 8500 },
  "전주": { volume12m: 5500, avg5y: 5000 },
  "창원": { volume12m: 7800, avg5y: 7200 },
  "김해": { volume12m: 5200, avg5y: 4500 },
  "포항": { volume12m: 3800, avg5y: 3500 },
  "제주": { volume12m: 4500, avg5y: 4000 },
};

/**
 * 주소에서 지역 키워드 추출
 */
function extractRegionKey(address: string): string | null {
  // 구 단위 매칭 (서울 내)
  const guMatch = address.match(/(강남구|서초구|송파구|마포구|용산구|성동구|영등포구)/);
  if (guMatch) return guMatch[1];

  // 시 단위 매칭 (경기/충청/경상/전라/제주)
  const cityMatch = address.match(/(수원|용인|성남|고양|화성|청주|천안|전주|창원|김해|포항|제주)/);
  if (cityMatch) return cityMatch[1];

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
