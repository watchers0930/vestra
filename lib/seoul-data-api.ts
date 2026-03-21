/**
 * VESTRA 서울 열린데이터광장 API 클라이언트
 * ──────────────────────────────────────────
 * 서울시 부동산 실거래가 정보(OA-21275)를 조회.
 * MOLIT 실거래 데이터와 교차 검증용.
 *
 * 서울시 한정 데이터. 미설정 시 graceful fallback (빈 배열).
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ SEOUL_DATA_API_KEY 발급: https://data.seoul.go.kr/ → 인증키 신청. │
 * │ .env.local에 SEOUL_DATA_API_KEY=발급받은키 추가                   │
 * └───────────────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "./api-cache";

// ─── 타입 정의 ───

export interface SeoulTransaction {
  dealAmount: number;      // 물건금액 (만원)
  buildYear: number;       // 건축년도
  dealYear: number;        // 신고년도
  dealMonth: number;       // 신고월
  district: string;        // 자치구
  dong: string;            // 법정동
  buildingPurpose: string; // 건물주용도
  landArea: number;        // 대지권면적 (㎡)
  buildingArea: number;    // 건물면적 (㎡)
  floor: number;           // 층
}

export interface SeoulPriceResult {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  transactions: SeoulTransaction[];
  dataSource: "live" | "fallback";
}

const EMPTY_RESULT: SeoulPriceResult = {
  avgPrice: 0,
  minPrice: 0,
  maxPrice: 0,
  transactionCount: 0,
  transactions: [],
  dataSource: "fallback",
};

/**
 * 서울시 자치구 매핑 (주소에서 자치구 추출용)
 */
const SEOUL_DISTRICTS = [
  "강남구", "서초구", "송파구", "강동구", "마포구", "용산구",
  "성동구", "광진구", "동작구", "영등포구", "양천구", "강서구",
  "구로구", "금천구", "관악구", "노원구", "도봉구", "강북구",
  "성북구", "중랑구", "동대문구", "종로구", "은평구", "서대문구", "중구",
];

/**
 * 주소에서 서울시 자치구 추출
 */
function extractSeoulDistrict(address: string): string | null {
  if (!address.includes("서울")) return null;
  for (const district of SEOUL_DISTRICTS) {
    if (address.includes(district)) return district;
  }
  return null;
}

/**
 * 서울시 부동산 실거래가 조회
 *
 * @param address - 주소 문자열 (서울시 포함)
 * @param year - 조회 년도 (기본: 현재년도)
 */
export async function fetchSeoulTransactions(
  address: string,
  year?: number
): Promise<SeoulPriceResult> {
  const district = extractSeoulDistrict(address);
  if (!district) return EMPTY_RESULT;

  const queryYear = year || new Date().getFullYear();
  const cacheKey = APICache.makeKey("seoul-tx", district, String(queryYear));
  const cached = apiCache.get<SeoulPriceResult>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.SEOUL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("SEOUL_DATA_API_KEY 환경변수가 설정되지 않았습니다.");
    return EMPTY_RESULT;
  }

  try {
    // 1,000건씩 조회 (서울시 API 최대 1,000건/요청)
    const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/tbLnOpendataRtmsV/1/1000/${queryYear}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Seoul Data API error: ${res.status}`);
      return EMPTY_RESULT;
    }

    const data = await res.json();
    const rows = data?.tbLnOpendataRtmsV?.row;
    if (!Array.isArray(rows) || rows.length === 0) return EMPTY_RESULT;

    // 해당 자치구 데이터만 필터링
    const transactions: SeoulTransaction[] = rows
      .filter((r: Record<string, string>) =>
        r.SGG_NM === district || r.SGG_NM?.includes(district)
      )
      .map((r: Record<string, string>) => ({
        dealAmount: parseInt(r.OBJ_AMT?.replace(/,/g, ""), 10) || 0,
        buildYear: parseInt(r.BUILD_YEAR, 10) || 0,
        dealYear: parseInt(r.ACC_YEAR, 10) || queryYear,
        dealMonth: parseInt(r.ACC_MONTH, 10) || 0,
        district: r.SGG_NM || "",
        dong: r.BJDONG_NM || "",
        buildingPurpose: r.BLDG_USGN || "",
        landArea: parseFloat(r.LAND_GBN_AR) || 0,
        buildingArea: parseFloat(r.BLDG_AR) || 0,
        floor: parseInt(r.FLR_NO, 10) || 0,
      }))
      .filter((t: SeoulTransaction) => t.dealAmount > 0 && t.dealAmount < 1000000); // 유효값만

    if (transactions.length === 0) return EMPTY_RESULT;

    const prices = transactions.map((t: SeoulTransaction) => t.dealAmount);
    const result: SeoulPriceResult = {
      avgPrice: Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      transactionCount: transactions.length,
      transactions,
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, 30 * 60 * 1000); // 30분 캐시
    return result;
  } catch (error) {
    console.warn("Seoul Data API fetch error:", error);
    return EMPTY_RESULT;
  }
}

/**
 * MOLIT 데이터와 서울시 데이터 교차 검증
 *
 * 두 소스의 평균가를 비교하여 신뢰도 보정값 반환.
 * 차이가 10% 이내면 높은 신뢰도, 20% 이상이면 경고.
 */
export function crossValidatePrice(
  molitAvgPrice: number,
  seoulAvgPrice: number
): { confidence: "high" | "medium" | "low"; deviation: number } {
  if (!molitAvgPrice || !seoulAvgPrice) {
    return { confidence: "medium", deviation: 0 };
  }

  const deviation = Math.abs(molitAvgPrice - seoulAvgPrice) / molitAvgPrice * 100;

  if (deviation < 10) return { confidence: "high", deviation: Math.round(deviation * 10) / 10 };
  if (deviation < 20) return { confidence: "medium", deviation: Math.round(deviation * 10) / 10 };
  return { confidence: "low", deviation: Math.round(deviation * 10) / 10 };
}
