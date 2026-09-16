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
