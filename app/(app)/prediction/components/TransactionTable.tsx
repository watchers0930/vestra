"use client";

import { formatKRW } from "@/lib/utils";
import type { RealTransaction, PredictionResult } from "../types";

interface Props {
  filteredTransactions: RealTransaction[];
  priceStats: PredictionResult["priceStats"];
  selectedArea: number | null;
}

export function TransactionTable({ filteredTransactions, priceStats, selectedArea }: Props) {
  if (filteredTransactions.length === 0) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
        overflow: "hidden",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#1d1d1f",
          marginBottom: "16px",
          letterSpacing: "-0.02em",
        }}
      >
        실거래 내역
        <span style={{ fontSize: "12px", fontWeight: 400, color: "#6e6e73", marginLeft: "8px" }}>
          ({priceStats?.period ?? ""} / {filteredTransactions.length}건{selectedArea !== null && ` / ${selectedArea}㎡`})
        </span>
      </h3>

      <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              {["아파트", "거래가", "면적", "층", "거래일"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    fontWeight: 600,
                    fontSize: "11.5px",
                    color: "#6e6e73",
                    textAlign: i === 0 ? "left" : "right",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.slice(0, 30).map((t, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "11px 14px", color: "#1d1d1f" }}>{t.aptName}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 600, color: "#1d1d1f" }}>{formatKRW(t.dealAmount)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", color: "#3c3c43" }}>{Math.round(t.area)}㎡</td>
                <td style={{ padding: "11px 14px", textAlign: "right", color: "#3c3c43" }}>{t.floor}층</td>
                <td style={{ padding: "11px 14px", textAlign: "right", color: "#aeaeb2" }}>
                  {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.{String(t.dealDay).padStart(2, "0")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
