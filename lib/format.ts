/** 한국 원화 금액 포맷 (억/만 단위) */
export function formatKRW(val: number): string {
  if (val >= 100_000_000) return `${(val / 100_000_000).toFixed(1)}억`;
  if (val >= 10_000) return `${Math.round(val / 10_000).toLocaleString()}만`;
  return val.toLocaleString() + "원";
}

/** 만원 단위 금액 → 억/만 표시 (시세지도용) */
export function formatPrice(priceInMan: number): string {
  if (priceInMan >= 10000) {
    const eok = Math.floor(priceInMan / 10000);
    const remainder = Math.round((priceInMan % 10000) / 1000);
    return remainder > 0 ? `${eok}.${remainder}억` : `${eok}억`;
  }
  return `${(priceInMan / 10000).toFixed(1)}억`;
}

/** 숫자 천단위 콤마 표시 */
export function formatNumber(val: number): string {
  return val.toLocaleString();
}

/** 콤마 제거 후 숫자 파싱 */
export function parseNumber(val: string): number {
  return Number(val.replace(/,/g, "")) || 0;
}
