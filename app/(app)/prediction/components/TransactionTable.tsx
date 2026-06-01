"use client";

import { formatKRW } from "@/lib/utils";
import type { OfficialPriceResult } from "@/lib/official-price-api";
import type { RealTransaction, PredictionResult } from "../types";

interface Props {
  filteredTransactions: RealTransaction[];
  priceStats: PredictionResult["priceStats"];
  selectedArea: number | null;
  officialPrice?: OfficialPriceResult | null;
}

function OfficialPriceCard({ data }: { data: OfficialPriceResult }) {
  const items: { label: string; value: string }[] = [];
  if (data.aptPrice) items.push({ label: "공동주택가격", value: formatKRW(data.aptPrice.price) });
  if (data.housePrice) items.push({ label: "개별주택가격", value: formatKRW(data.housePrice.price) });
  if (data.landPrice) items.push({ label: "개별공시지가", value: `${formatKRW(data.landPrice.price)}/㎡` });
  if (items.length === 0) return null;

  return (
    <div style={{ width: "240px", flexShrink: 0, background: "#f5f5f7", borderRadius: "16px", padding: "18px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, marginBottom: "4px" }}>
        공시가격
      </p>
      <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0, marginBottom: "14px" }}>
        {data.year}년 기준
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: "10.5px", color: "#6e6e73", margin: 0, marginBottom: "2px" }}>{label}</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionTable({ filteredTransactions, priceStats, selectedArea, officialPrice }: Props) {
  if (filteredTransactions.length === 0) return null;

  const showCard = officialPrice && (officialPrice.aptPrice || officialPrice.housePrice || officialPrice.landPrice);

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

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {showCard && <OfficialPriceCard data={officialPrice} />}
        <div style={{ flex: 1, minWidth: 0, overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
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
    </div>
  );
}
