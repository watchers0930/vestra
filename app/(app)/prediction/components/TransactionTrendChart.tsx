"use client";

import { Activity } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Card } from "@/components/common";
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
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={16} strokeWidth={1.5} />
          실거래 추이
          <span className="text-xs font-normal text-secondary">
            (월별 평균{selectedApt ? ` · ${selectedApt}` : ""}{selectedArea !== null ? ` · ${selectedArea}㎡` : ""})
          </span>
        </h3>
        <span className="text-[11px] text-[#6e6e73]">{trendData.length}개월</span>
      </div>
      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e5e7" }} />
            <YAxis
              tickFormatter={(v: number) => v >= 100000000 ? `${(v / 100000000).toFixed(1)}억` : `${Math.round(v / 10000).toLocaleString()}만`}
              tick={{ fontSize: 11 }}
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
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e7" }}
            />
            <Area type="monotone" dataKey="maxPrice" stroke="none" fill="#e5e5e7" fillOpacity={0.3} name="최고가" />
            <Area type="monotone" dataKey="minPrice" stroke="none" fill="#ffffff" fillOpacity={1} name="최저가" />
            <Line type="monotone" dataKey="avgPrice" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#2563eb" }} name="평균가" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#6e6e73]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[#2563eb] rounded" />평균 거래가
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-[#e5e5e7] rounded-sm opacity-50" />최고-최저 범위
        </span>
        <span className="ml-auto">총 {totalTransactions}건 거래</span>
      </div>
    </Card>
  );
}
