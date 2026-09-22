/**
 * 국토교통부 실거래가 API — 종합 시세 조회 (매매 + 전월세)
 */
import { MOLIT_ENDPOINTS } from "./molit-data";
import type { ComprehensivePriceResult, PriceResult, ResidentialSaleType } from "./types";
import { extractLawdCode } from "./address-utils";
import { fetchRecentResidentialSalePrices, fetchGenericSaleTransactions } from "./sale";
import { fetchRecentRentPrices } from "./rent";

/**
 * 종합 시세 조회 (매매 + 전월세)
 * @param type 부동산 유형(아파트/연립다세대/단독다가구/오피스텔). 기본 아파트.
 *   - 아파트: 데이터가 부족하면(<3건) 연립다세대·오피스텔 실거래로 보충 병합(기존 동작 유지).
 *   - 비아파트: 해당 유형만 순수 조회(다른 유형 혼재 방지).
 */
export async function fetchComprehensivePrices(
  address: string,
  months: number = 12,
  type: ResidentialSaleType = "apartment"
): Promise<ComprehensivePriceResult> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return { sale: null, rent: null, jeonseRatio: null };

  const now = new Date();
  const dealYmds = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [saleResult, rentResult] = await Promise.all([
    fetchRecentResidentialSalePrices(address, months, type),
    fetchRecentRentPrices(address, months, type),
  ]);

  let sale: PriceResult | null = saleResult;
  // 아파트만 보충 병합: 아파트 표본이 적을 때 연립·오피스텔로 지역 시세를 채운다.
  // (비아파트 유형은 요청 유형 순수 조회 유지 — 혼재 시 유형별 의미 상실)
  if (type === "apartment" && (!sale || sale.transactionCount < 3)) {
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
