/**
 * 국토교통부 실거래가 API — 공용 타입
 */

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

/**
 * 사용자 표기(매물 roomType·전세안전분석 라벨·시세전망 선택 등)를 MOLIT 실거래 유형으로 매핑.
 * MOLIT 실거래 API는 아파트/연립다세대/단독다가구/오피스텔 4종만 제공하므로,
 * 표기 변형(빌라·연립·원룸/투룸 등)을 가장 가까운 유형으로 정규화한다.
 * - 오피스텔 → officetel
 * - 단독/다가구 → singlehouse
 * - 빌라/다세대/연립/원룸/투룸 → rowhouse (원룸·투룸은 대체로 다세대·연립 건물이라 근접 대체)
 * - 그 외(아파트·미지정) → apartment (기본)
 */
export function toResidentialType(label?: string | null): ResidentialSaleType {
  const s = (label || "").replace(/\s/g, "");
  if (!s) return "apartment";
  if (s.includes("오피스텔")) return "officetel";
  if (s.includes("단독") || s.includes("다가구")) return "singlehouse";
  if (
    s.includes("빌라") || s.includes("다세대") || s.includes("연립") ||
    s.includes("원룸") || s.includes("투룸")
  ) {
    return "rowhouse";
  }
  return "apartment";
}
