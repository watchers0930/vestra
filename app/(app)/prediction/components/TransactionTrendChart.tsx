"use client";

import { Activity } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface TrendDataItem {
  month: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
}

interface Props {
  trendData: TrendDataItem[];
  totalTransactions: number;
  selectedApt: string | null;
  selectedArea: number | null;
}

export function TransactionTrendChart({ trendData, totalTransactions, selectedApt, selectedArea }: Props) {
  if (trendData.length < 2) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#6e6e73",
          }}
        >
          <Activity size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
          실거래 추이
          <span style={{ fontSize: "11px", fontWeight: 400, color: "#aeaeb2" }}>
            (월별 평균{selectedApt ? ` · ${selectedApt}` : ""}{selectedArea !== null ? ` · ${selectedArea}㎡` : ""})
          </span>
        </h3>
        <span style={{ fontSize: "11px", color: "#aeaeb2" }}>{trendData.length}개월</span>
      </div>

      <div style={{ height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#0071e3" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#aeaeb2" }} tickLine={false} axisLine={{ stroke: "#e5e5e7" }} />
            <YAxis
              tickFormatter={(v: number) => v >= 100000000 ? `${(v / 100000000).toFixed(1)}억` : `${Math.round(v / 10000).toLocaleString()}만`}
              tick={{ fontSize: 11, fill: "#aeaeb2" }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                const label = name === "avgPrice" ? "평균가" : name === "maxPrice" ? "최고가" : name === "minPrice" ? "최저가" : name;
                return [formatKRW(Number(value)), label];
              }}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
            />
            <Area type="monotone" dataKey="maxPrice" stroke="none" fill="#e5e5e7" fillOpacity={0.3} name="최고가" />
            <Area type="monotone" dataKey="minPrice" stroke="none" fill="#ffffff" fillOpacity={1} name="최저가" />
            <Line type="monotone" dataKey="avgPrice" stroke="#0071e3" strokeWidth={2.5} dot={{ r: 3, fill: "#0071e3", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#0071e3" }} name="평균가" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "11px", color: "#6e6e73" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "14px", height: "2px", background: "#0071e3", borderRadius: "2px" }} />
          평균 거래가
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#e5e5e7", borderRadius: "3px", opacity: 0.6 }} />
          최고-최저 범위
        </span>
        <span style={{ marginLeft: "auto" }}>총 {totalTransactions}건 거래</span>
      </div>
    </div>
  );
}
