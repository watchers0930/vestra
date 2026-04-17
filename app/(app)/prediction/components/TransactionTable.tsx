"use client";

import { formatKRW } from "@/lib/utils";
import { Card } from "@/components/common";
import type { RealTransaction, PredictionResult } from "../types";

interface Props {
  filteredTransactions: RealTransaction[];
  priceStats: PredictionResult["priceStats"];
  selectedArea: number | null;
}

export function TransactionTable({ filteredTransactions, priceStats, selectedArea }: Props) {
  if (filteredTransactions.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">
        실거래 내역
        <span className="text-sm font-normal text-secondary ml-2">
          ({priceStats?.period ?? ""} / {filteredTransactions.length}건{selectedArea !== null && ` / ${selectedArea}㎡`})
        </span>
      </h3>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-secondary">아파트</th>
              <th className="text-right py-3 px-4 font-medium text-secondary">거래가</th>
              <th className="text-right py-3 px-4 font-medium text-secondary">면적</th>
              <th className="text-right py-3 px-4 font-medium text-secondary">층</th>
              <th className="text-right py-3 px-4 font-medium text-secondary">거래일</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.slice(0, 30).map((t, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-[#f5f5f7]">
                <td className="py-3 px-4">{t.aptName}</td>
                <td className="text-right py-3 px-4 font-medium">{formatKRW(t.dealAmount)}</td>
                <td className="text-right py-3 px-4">{Math.round(t.area)}㎡</td>
                <td className="text-right py-3 px-4">{t.floor}층</td>
                <td className="text-right py-3 px-4 text-secondary">
                  {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.{String(t.dealDay).padStart(2, "0")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
