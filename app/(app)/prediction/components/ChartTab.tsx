"use client";

import { Suspense } from "react";
import { BarChart3, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { Card } from "@/components/common";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import dynamic from "next/dynamic";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { PredictionResult, RealTransaction } from "../types";

const MonthlyForecastChart = dynamic(
  () => import("@/components/prediction/MonthlyForecast").then((mod) => ({ default: mod.MonthlyForecastChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);

interface Props {
  result: PredictionResult;
  historicalData: { date: string; price: number; label: string }[];
  chartData: { year: string; optimistic: number; base: number; pessimistic: number }[];
  activeScenario: string;
  setActiveScenario: (s: string) => void;
  filteredTransactions: RealTransaction[];
  filteredStats: { avgPrice: number; count: number } | null;
  scenarios: { id: string; label: string; color: string }[];
}

export function ChartTab({
  result, historicalData, chartData,
  activeScenario, setActiveScenario,
  filteredTransactions, scenarios,
}: Props) {
  return (
    <div className="space-y-6">
      {/* 실거래가 추이 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 size={16} strokeWidth={1.5} />실거래가 추이
        </h3>
        {historicalData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(1)}억`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [formatKRW(Number(value)), "거래가"]} labelFormatter={(label) => `거래시점: ${label}`} />
                <Area type="monotone" dataKey="price" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-secondary text-sm">실거래 데이터가 없습니다</div>
        )}
      </Card>

      {/* 월별 예측 추이 */}
      {result.monthlyForecast && result.monthlyForecast.length > 0 && (
        <ErrorBoundary>
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
            <MonthlyForecastChart forecasts={result.monthlyForecast} currentPrice={result.currentPrice} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* 시나리오별 예측 차트 */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">시나리오별 가격 예측</h3>
          <div className="flex flex-wrap gap-1.5">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                className={cn("px-3 py-1 text-xs rounded-full border transition-all",
                  activeScenario === s.id
                    ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                    : "bg-white text-secondary border-border hover:bg-[#f5f5f7]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`} />
              <Tooltip formatter={(value) => [formatKRW(Number(value)), ""]} />
              <Legend />
              {(activeScenario === "all" || activeScenario === "optimistic") && (
                <Line type="monotone" dataKey="optimistic" name="낙관적" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
              )}
              {(activeScenario === "all" || activeScenario === "base") && (
                <Line type="monotone" dataKey="base" name="기본" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              )}
              {(activeScenario === "all" || activeScenario === "pessimistic") && (
                <Line type="monotone" dataKey="pessimistic" name="비관적" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 가격 영향 요인 */}
      {result.factors && result.factors.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} strokeWidth={1.5} />가격 영향 요인 분석
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.factors.map((factor, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-[#f5f5f7]/50">
                <div className="flex items-center gap-2 mb-2">
                  {factor.impact === "positive" && <TrendingUp size={16} className="text-emerald-600" />}
                  {factor.impact === "negative" && <TrendingDown size={16} className="text-red-600" />}
                  {factor.impact === "neutral" && <Minus size={16} className="text-[#6e6e73]" />}
                  <span className="font-medium text-sm">{factor.name}</span>
                  <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium",
                    factor.impact === "positive" && "bg-emerald-100 text-emerald-700",
                    factor.impact === "negative" && "bg-red-100 text-red-700",
                    factor.impact === "neutral" && "bg-[#e5e5e7] text-[#6e6e73]"
                  )}>
                    {factor.impact === "positive" ? "상승요인" : factor.impact === "negative" ? "하락요인" : "중립"}
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">{factor.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 시나리오별 예측 상세 테이블 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">시나리오별 예측 상세</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-secondary">시나리오</th>
                <th className="text-right py-3 px-4 font-medium text-secondary">1년 후</th>
                <th className="text-right py-3 px-4 font-medium text-secondary">5년 후</th>
                <th className="text-right py-3 px-4 font-medium text-secondary">10년 후</th>
              </tr>
            </thead>
            <tbody>
              {([
                { key: "optimistic" as const, label: "낙관적", color: "text-emerald-600" },
                { key: "base" as const, label: "기본", color: "text-blue-600" },
                { key: "pessimistic" as const, label: "비관적", color: "text-red-600" },
              ]).map((scenario) => (
                <tr key={scenario.key} className="border-b border-border/50 hover:bg-[#f5f5f7]">
                  <td className={cn("py-3 px-4 font-medium", scenario.color)}>{scenario.label}</td>
                  <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["1y"])}</td>
                  <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["5y"])}</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatKRW(result.predictions[scenario.key]["10y"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 거래 건수 요약 */}
      {filteredTransactions.length === 0 && (
        <div className="text-center text-sm text-secondary py-8">선택한 조건의 실거래 데이터가 없습니다</div>
      )}
    </div>
  );
}
