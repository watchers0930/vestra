"use client";

import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "@/components/common";
import { useHydrated } from "@/lib/use-hydrated";
import type { DailyPoint } from "@/lib/ga4-reports";

interface Props {
  daily: DailyPoint[];
}

const SERIES = [
  { key: "activeUsers", name: "활성 사용자", color: "#2e4bd8" },
  { key: "sessions", name: "세션", color: "#30a46c" },
  { key: "screenPageViews", name: "페이지뷰", color: "#f59e0b" },
] as const;

export function StatTrendChart({ daily }: Props) {
  const mounted = useHydrated();

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp size={16} strokeWidth={1.5} />
        일별 추이
      </h3>
      <div className="h-[280px]">
        {mounted && daily.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={44} />
              <Tooltip labelFormatter={(l) => `날짜: ${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  fill={`url(#grad-${s.key})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-[#f5f5f7]" />
        )}
      </div>
    </Card>
  );
}
