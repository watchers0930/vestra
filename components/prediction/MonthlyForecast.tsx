"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import type { MonthlyPrediction } from "@/lib/prediction-engine";

interface MonthlyForecastProps {
  forecasts: MonthlyPrediction[];
  currentPrice: number;
}

function formatPrice(won: number): string {
  if (won >= 100000000) return `${(won / 100000000).toFixed(1)}억`;
  return `${Math.round(won / 10000).toLocaleString()}만`;
}

export function MonthlyForecastChart({ forecasts, currentPrice }: MonthlyForecastProps) {
  if (!forecasts || forecasts.length === 0) return null;

  const data = [
    { month: "현재", price: currentPrice, confidence: 100 },
    ...forecasts.map((f) => ({
      month: `${f.month}개월`,
      price: f.price,
      confidence: f.confidence,
    })),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">월별 가격 예측 추이</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis
            tickFormatter={(v) => formatPrice(v)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={70}
          />
          <Tooltip
            formatter={(value: number | undefined) => [formatPrice(value ?? 0), "예측가"]}
            labelFormatter={(label) => `${label} 후`}
          />
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            fill="url(#priceGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>신뢰도: {forecasts[0]?.confidence}% → {forecasts[forecasts.length - 1]?.confidence}%</span>
        <span>계절성 조정 포함</span>
      </div>
    </div>
  );
}
