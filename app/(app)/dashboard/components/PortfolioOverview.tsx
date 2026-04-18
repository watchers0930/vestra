"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface RiskItem { name: string; value: number; fill: string }
interface AssetValueItem { name: string; value: number; risk: number }

interface Props {
  totalValue: number;
  totalAssets: number;
  avgRisk: number;
  avgSafety: number;
  riskDistribution: RiskItem[];
  assetValueData: AssetValueItem[];
}

export function PortfolioOverview({ totalValue, totalAssets, avgRisk, avgSafety, riskDistribution, assetValueData }: Props) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7]">
            <PieChartIcon className="h-4 w-4 text-[#1d1d1f]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">포트폴리오 개요</h2>
            <p className="text-xs text-[#6e6e73] mt-0.5">자산 구성 및 리스크 분포</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6e6e73]">총 추정가치</p>
          <p className="text-lg font-bold text-[#1d1d1f]">{formatKRW(totalValue)}</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 리스크 분포 파이 차트 */}
        <div>
          <h3 className="text-sm font-medium text-[#1d1d1f] mb-3">리스크 분포</h3>
          <div className="h-[200px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}건`}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}건`, "자산 수"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-xs text-[#6e6e73]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 자산별 추정가치 바 차트 */}
        <div>
          <h3 className="text-sm font-medium text-[#1d1d1f] mb-3">자산별 추정가치</h3>
          {assetValueData.length > 0 ? (
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetValueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [formatKRW(Number(value)), "추정가"]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {assetValueData.map((entry, index) => (
                      <Cell key={index} fill={entry.risk <= 30 ? "#34d399" : entry.risk <= 60 ? "#fbbf24" : "#f87171"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[#6e6e73]">자산 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-xs text-[#6e6e73]">총 자산</p>
          <p className="text-sm font-bold text-[#1d1d1f]">{totalAssets}건</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6e6e73]">평균 리스크</p>
          <p className={cn("text-sm font-bold", avgRisk <= 30 ? "text-emerald-600" : avgRisk <= 60 ? "text-amber-600" : "text-red-600")}>
            {avgRisk}점
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6e6e73]">평균 안전지수</p>
          <p className={cn("text-sm font-bold", avgSafety >= 70 ? "text-emerald-600" : avgSafety >= 40 ? "text-amber-600" : "text-red-600")}>
            {avgSafety}점
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6e6e73]">평균 자산가치</p>
          <p className="text-sm font-bold text-[#1d1d1f]">
            {totalAssets > 0 ? formatKRW(Math.round(totalValue / totalAssets)) : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
