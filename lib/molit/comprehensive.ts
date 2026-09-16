/**
 * 국토교통부 실거래가 API — 종합 시세 조회 (매매 + 전월세)
 */
import { MOLIT_ENDPOINTS } from "./molit-data";
import type { ComprehensivePriceResult, PriceResult } from "./types";
import { extractLawdCode } from "./address-utils";
import { fetchRecentPrices, fetchGenericSaleTransactions } from "./sale";
import { fetchRecentRentPrices } from "./rent";

/**
 * 종합 시세 조회 (매매 + 전월세, 아파트 + 연립 + 단독 + 오피스텔)
 */
export async function fetchComprehensivePrices(
  address: string,
  months: number = 12
): Promise<ComprehensivePriceResult> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return { sale: null, rent: null, jeonseRatio: null };

  const now = new Date();
  const dealYmds = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [saleResult, rentResult] = await Promise.all([
    fetchRecentPrices(address, months),
    fetchRecentRentPrices(address, months),
  ]);

  let sale: PriceResult | null = saleResult;
  if (!sale || sale.transactionCount < 3) {
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
