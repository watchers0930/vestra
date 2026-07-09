import { formatPrice } from "@/lib/format";
import type { AptData, PriceMapTradeType } from "../types";

function formatRentAmount(priceInMan: number): string {
  if (priceInMan >= 10000) return formatPrice(priceInMan);
  return `${priceInMan.toLocaleString()}만`;
}

export function formatMapPrice(apt: AptData, tradeType: PriceMapTradeType): string {
  if (tradeType === "전세") {
    return formatRentAmount(apt.deposit ?? apt.price);
  }
  return formatPrice(apt.price);
}
