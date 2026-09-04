"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";

interface MarketData {
  avgDeposit: number;
  monthly: { month: string; avgDeposit: number; avgWolse: number; count: number }[];
  period: string;
  listingDeposit: number;
  listingType: string;
  barLabel: string;
}

interface ChartPoint { label: string; avgDeposit: number; avgWolse: number; }

function formatTick(value: number): string {
  if (value >= 10000) return `${Math.floor(value / 10000)}억`;
  if (value >= 1000) return `${Math.floor(value / 1000)}천만`;
  return `${value}만`;
}

export function MarketTab({ listingId }: { listingId: string }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/listings/${listingId}/market-price`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("시세 데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "#aeaeb2" }}>
      <Loader2 size={20} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13 }}>시세 조회 중...</span>
    </div>
  );
  if (error || !data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#aeaeb2", gap: 8 }}>
      <TrendingUp size={32} strokeWidth={1.2} />
      <p style={{ fontSize: 13, margin: 0 }}>{error || "조회 가능한 시세 데이터가 없습니다."}</p>
    </div>
  );

  const hasData = data.monthly.some((m) => m.avgDeposit > 0 || m.avgWolse > 0);
  if (!hasData) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#aeaeb2", gap: 8 }}>
      <TrendingUp size={32} strokeWidth={1.2} />
      <p style={{ fontSize: 13, margin: 0 }}>해당 지역의 시세 데이터가 없습니다.</p>
    </div>
  );

  const chartData: ChartPoint[] = data.monthly.map((m) => ({
    label: `${parseInt(m.month.slice(5), 10)}월`,
    avgDeposit: m.avgDeposit,
    avgWolse: m.avgWolse,
  }));

  const lastMonth = data.monthly[data.monthly.length - 1];
  const gapPct = lastMonth?.avgDeposit > 0
    ? Math.round(((data.listingDeposit - lastMonth.avgDeposit) / lastMonth.avgDeposit) * 100)
    : null;
  const isHigh = (gapPct ?? 0) > 0;
  const isSignificant = Math.abs(gapPct ?? 0) >= 20;

  return (
    <div>
      {/* 헤더 */}
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 14px" }}>
        <TrendingUp size={16} strokeWidth={1.5} style={{ color: "var(--brand-primary)" }} />
        인근 시세 추이 ({data.period})
      </h3>

      {/* 시세 비교 배지 */}
      {gapPct !== null && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: 10, padding: "9px 14px", marginBottom: 14,
          background: isSignificant ? (isHigh ? "#fff0f0" : "#f0fff4") : "#f2f5fa",
          color: isSignificant ? (isHigh ? "#c0392b" : "#22a75e") : "#6e6e73",
        }}>
          <span style={{ fontSize: 12 }}>시세 대비 현재 보증금</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {gapPct > 0 ? "+" : ""}{gapPct}%{isSignificant ? (isHigh ? " ↑ 시세 초과" : " ↓ 시세 이하") : ""}
          </span>
        </div>
      )}

      {/* 바차트 */}
      <div style={{ overflowX: "auto", marginBottom: 4 }}>
        <div style={{ minWidth: 280 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8e8e93" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatTick} tick={{ fontSize: 11, fill: "#8e8e93" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                formatter={(v: unknown, n: unknown) => [`${Number(v).toLocaleString()}만원`, String(n)]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #DDE3EF", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar dataKey="avgDeposit" name={data.barLabel} fill="#93C5FD" radius={[3, 3, 0, 0]} maxBarSize={32} />
              {data.monthly.some((m) => m.avgWolse > 0) && (
                <Bar dataKey="avgWolse" name="평균월세" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={32} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 월별 테이블 */}
      <div style={{ overflowX: "auto", marginTop: 4 }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #e5e5ea" }}>
              {([`월`, data.barLabel, "평균월세", "건수"]).map((h, i) => (
                <th key={h} style={{ padding: "6px 0", fontWeight: 600, color: "#8e8e93", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m) => (
              <tr key={m.month} style={{ borderBottom: "1px solid #f0f3fa" }}>
                <td style={{ padding: "9px 0", color: "#1d1d1f" }}>{m.month}</td>
                <td style={{ padding: "9px 0", color: "#1d1d1f", textAlign: "right" }}>{m.avgDeposit > 0 ? `${m.avgDeposit.toLocaleString()}만` : "-"}</td>
                <td style={{ padding: "9px 0", color: "#1d1d1f", textAlign: "right" }}>{m.avgWolse > 0 ? `${m.avgWolse.toLocaleString()}만` : "-"}</td>
                <td style={{ padding: "9px 0", color: "#aeaeb2", textAlign: "right" }}>{m.count}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: "#aeaeb2", marginTop: 12 }}>
        국토교통부 실거래가 공개데이터 기반. 실제 거래가와 다를 수 있습니다.
      </p>
    </div>
  );
}
