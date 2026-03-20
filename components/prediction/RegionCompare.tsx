"use client";

import { useState } from "react";
import { Search, Plus, X, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface CompareResult {
  address: string;
  currentPrice: number;
  prediction1y: number;
  confidence: number;
}

interface RegionCompareProps {
  primaryResult?: CompareResult;
}

function formatPrice(won: number): string {
  if (won >= 100000000) return `${(won / 100000000).toFixed(1)}억`;
  return `${Math.round(won / 10000).toLocaleString()}만`;
}

export function RegionCompare({ primaryResult }: RegionCompareProps) {
  const [compareAddresses, setCompareAddresses] = useState<string[]>([""]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const addresses = compareAddresses.filter((a) => a.trim());
    if (addresses.length === 0) return;

    setLoading(true);
    try {
      const promises = addresses.map(async (addr) => {
        const res = await fetch("/api/predict-value", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: addr }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          address: addr,
          currentPrice: data.currentPrice,
          prediction1y: data.predictions?.base?.["1y"] ?? 0,
          confidence: data.confidence,
        } as CompareResult;
      });

      const compareResults = (await Promise.all(promises)).filter(Boolean) as CompareResult[];
      setResults(compareResults);
    } finally {
      setLoading(false);
    }
  };

  const allResults = [
    ...(primaryResult ? [primaryResult] : []),
    ...results,
  ];

  const chartData = allResults.map((r) => ({
    name: r.address.length > 12 ? r.address.slice(-12) : r.address,
    "현재가": r.currentPrice,
    "1년 예측": r.prediction1y,
  }));

  return (
    <div className="space-y-4">
      {/* 비교 지역 입력 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={14} className="text-gray-400" />
          <h3 className="text-[11px] font-medium text-gray-400">비교 지역 (최대 3개)</h3>
        </div>
        <div className="space-y-2">
          {compareAddresses.map((addr, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={addr}
                onChange={(e) => {
                  const next = [...compareAddresses];
                  next[idx] = e.target.value;
                  setCompareAddresses(next);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="비교할 주소 입력 (예: 서울 서초구 반포동)"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              />
              {compareAddresses.length > 1 && (
                <button
                  onClick={() => setCompareAddresses(compareAddresses.filter((_, i) => i !== idx))}
                  className="px-2.5 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {compareAddresses.length < 3 && (
            <button
              onClick={() => setCompareAddresses([...compareAddresses, ""])}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus size={14} />
              지역 추가
            </button>
          )}
          <button
            onClick={handleCompare}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <Search size={14} />
            {loading ? "비교 중..." : "비교 분석"}
          </button>
        </div>
      </div>

      {/* 비교 차트 */}
      {chartData.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-medium text-gray-400 mb-4">지역별 시세 비교</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tickFormatter={(v) => formatPrice(v)} tick={{ fontSize: 11, fill: "#9ca3af" }} width={70} />
              <Tooltip formatter={(value: number | undefined) => formatPrice(value ?? 0)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="현재가" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
              <Bar dataKey="1년 예측" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 비교 테이블 */}
      {allResults.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400">지역</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400">현재가</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400">1년 예측</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400">변동률</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400">신뢰도</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((r, idx) => {
                const change = r.currentPrice > 0
                  ? ((r.prediction1y - r.currentPrice) / r.currentPrice * 100).toFixed(1)
                  : "0";
                return (
                  <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 text-xs">{r.address}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatPrice(r.currentPrice)}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatPrice(r.prediction1y)}</td>
                    <td className={`px-4 py-3 text-right text-xs font-medium ${parseFloat(change) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {parseFloat(change) >= 0 ? "+" : ""}{change}%
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{r.confidence}점</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
