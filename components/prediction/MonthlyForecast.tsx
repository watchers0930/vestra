"use client";

import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import type { MonthlyPrediction } from "@/lib/prediction-engine";

interface MonthlyForecastProps {
  forecasts: MonthlyPrediction[];
  currentPrice: number;
}

function formatPrice(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const man = Math.round((won % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  }
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

  const lastPrice = forecasts[forecasts.length - 1]?.price ?? currentPrice;
  const changeRate = currentPrice > 0
    ? ((lastPrice - currentPrice) / currentPrice * 100).toFixed(1)
    : "0";
  const isUp = parseFloat(changeRate) >= 0;

  return (
    <div className="space-y-3">
      {/* 요약 헤더 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            <p className="text-[11px] font-medium text-gray-400">월별 가격 예측 추이</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1 ${
              isUp ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
            }`}>
              <TrendingUp size={10} />
              {forecasts.length}개월 후 {isUp ? "+" : ""}{changeRate}%
            </span>
          </div>
        </div>

        {/* 차트 */}
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatPrice(v)}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number | undefined) => [formatPrice(value ?? 0), "예측가"]}
                labelFormatter={(label) => label === "현재" ? "현재 시세" : `${label} 후`}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <ReferenceLine
                y={currentPrice}
                stroke="#d1d5db"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#6366f1"
                fill="url(#monthlyGradient)"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 + 신뢰도 */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2.5 h-0.5 rounded bg-indigo-500" />예측 가격
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2.5 h-0.5 rounded bg-gray-300 border-t border-dashed border-gray-300" />현재가 기준선
            </span>
          </div>
          <span className="text-[10px] text-gray-400">
            신뢰도 {forecasts[0]?.confidence}% → {forecasts[forecasts.length - 1]?.confidence}%
          </span>
        </div>
      </div>

      {/* 신뢰도 바 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-[11px] font-medium text-gray-400 mb-3">월별 예측 신뢰도</p>
        <div className="space-y-1.5">
          {forecasts.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12 text-right">{f.month}개월</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${f.confidence}%`,
                    backgroundColor: f.confidence >= 70 ? "#6366f1" : f.confidence >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-500 w-8">{f.confidence}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
