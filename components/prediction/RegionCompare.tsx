"use client";

import { useState } from "react";
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
    name: r.address.length > 10 ? r.address.slice(-10) : r.address,
    "현재가": r.currentPrice,
    "1년 예측": r.prediction1y,
  }));

  return (
    <div className="space-y-4">
      {/* 비교 지역 입력 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">지역 비교 (최대 3개)</h3>
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
                placeholder="비교할 주소 입력 (예: 서울 서초구 반포동)"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              {compareAddresses.length > 1 && (
                <button
                  onClick={() => setCompareAddresses(compareAddresses.filter((_, i) => i !== idx))}
                  className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {compareAddresses.length < 3 && (
            <button
              onClick={() => setCompareAddresses([...compareAddresses, ""])}
              className="px-4 py-2 text-sm text-blue-500 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              + 지역 추가
            </button>
          )}
          <button
            onClick={handleCompare}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "비교 중..." : "비교 분석"}
          </button>
        </div>
      </div>

      {/* 비교 차트 */}
      {chartData.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">지역별 시세 비교</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tickFormatter={(v) => formatPrice(v)} tick={{ fontSize: 11, fill: "#9ca3af" }} width={70} />
              <Tooltip formatter={(value: number | undefined) => formatPrice(value ?? 0)} />
              <Legend />
              <Bar dataKey="현재가" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="1년 예측" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 비교 테이블 */}
      {allResults.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">지역</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">현재가</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">1년 예측</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">변동률</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">신뢰도</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((r, idx) => {
                const change = r.currentPrice > 0
                  ? ((r.prediction1y - r.currentPrice) / r.currentPrice * 100).toFixed(1)
                  : "0";
                return (
                  <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{r.address}</td>
                    <td className="px-4 py-2 text-right">{formatPrice(r.currentPrice)}</td>
                    <td className="px-4 py-2 text-right">{formatPrice(r.prediction1y)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${parseFloat(change) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {parseFloat(change) >= 0 ? "+" : ""}{change}%
                    </td>
                    <td className="px-4 py-2 text-right">{r.confidence}점</td>
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
