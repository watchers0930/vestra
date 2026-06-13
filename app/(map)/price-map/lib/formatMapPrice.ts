import { formatPrice } from "@/lib/format";
import type { AptData, PriceMapTradeType } from "../types";

function formatRentAmount(priceInMan: number): string {
  if (priceInMan >= 10000) return formatPrice(priceInMan);
  return `${priceInMan.toLocaleString()}만`;
}

export function formatMapPrice(apt: AptData, tradeType: PriceMapTradeType): string {
  if (tradeType === "월세") {
    const deposit = apt.deposit ? formatRentAmount(apt.deposit) : "-";
    const monthly = apt.monthlyRent ?? apt.price;
    return `보증금 ${deposit} / 월 ${monthly.toLocaleString()}만`;
  }
  if (tradeType === "전세") {
    return formatRentAmount(apt.deposit ?? apt.price);
  }
  return formatPrice(apt.price);
}
