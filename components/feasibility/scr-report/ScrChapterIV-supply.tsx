"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import { TrendingUp, Home } from "lucide-react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrPriceReview,
  ScrSalesCase,
  ScrSupplyCase,
} from "@/lib/feasibility/scr-types";

/* ─── 표32: 시세추이 7년 차트 ─── */
export function RegionalTrendChart({ data }: { data: ScrPriceReview["regionalTrend"] }) {
  if (!data.length) return null;

  const chartData = data.map((r) => ({
    year: `${r.year}`,
    시세: r.avgMarketPrice,
    분양가: r.avgSalePrice,
    프리미엄률: r.premiumRate,
  }));

  return (
    <ScrSection icon={TrendingUp} title="표32. 지역 평균 시세 및 분양가 추이" sub="최근 7년">
      <div className="h-64 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${v.toLocaleString()}`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value, name) =>
                name === "프리미엄률" ? `${Number(value).toFixed(1)}%` : `${Number(value).toLocaleString()} 만원/평`
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="시세" stroke="#3b82f6" fill="#3b82f640" strokeWidth={2} />
            <Area type="monotone" dataKey="분양가" stroke="#10b981" fill="#10b98140" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>평균 시세(만원/평)</th>
              <th className={cn(thCls, "text-right")}>평균 분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄률</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.avgMarketPrice.toLocaleString()}</td>
                <td className={tdNumCls}>{r.avgSalePrice.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.premiumRate > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate > 0 ? "+" : ""}{r.premiumRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표33,34: 매매사례 ─── */
export function SalesCasesTable({ cases }: { cases: ScrSalesCase[] }) {
  if (!cases.length) return null;

  return (
    <ScrSection icon={Home} title="표33~34. 인근 매매사례">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-right")}>전용(m²)</th>
              <th className={cn(thCls, "text-right")}>거래가(만원)</th>
              <th className={cn(thCls, "text-right")}>전용 평당가</th>
              <th className={cn(thCls, "text-center")}>거래일</th>
              <th className={cn(thCls, "text-right")}>층</th>
              <th className={cn(thCls, "text-right")}>건축년</th>
              <th className={cn(thCls, "text-right")}>거리(km)</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>
                  <div>
                    <p className="font-medium">{r.complexName}</p>
                    <p className="text-[10px] text-[#86868b]">{r.address}</p>
                  </div>
                </td>
                <td className={tdNumCls}>{r.exclusiveArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.transactionPrice.toLocaleString()}</td>
                <td className={tdNumCls}>{r.pricePerExclusivePyeong.toLocaleString()}</td>
                <td className={cn(tdCls, "text-center")}>{r.transactionDate}</td>
                <td className={tdNumCls}>{r.floor}</td>
                <td className={tdNumCls}>{r.buildYear}</td>
                <td className={tdNumCls}>{r.distanceKm.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표35,36: 분양사례 ─── */
export function SupplyCasesTable({ cases }: { cases: ScrSupplyCase[] }) {
  if (!cases.length) return null;

  return (
    <ScrSection icon={Home} title="표35~36. 인근 분양사례">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-left")}>시공사</th>
              <th className={cn(thCls, "text-right")}>세대수</th>
              <th className={cn(thCls, "text-right")}>전용(m²)</th>
              <th className={cn(thCls, "text-right")}>분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>현재시세</th>
              <th className={cn(thCls, "text-right")}>프리미엄</th>
              <th className={cn(thCls, "text-right")}>분양률</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>
                  <div>
                    <p className="font-medium">{r.complexName}</p>
                    <p className="text-[10px] text-[#86868b]">{r.address}</p>
                  </div>
                </td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.constructor}</td>
                <td className={tdNumCls}>{r.totalUnits.toLocaleString()}</td>
                <td className={tdNumCls}>{r.exclusiveArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.salePricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentMarketPrice ? r.currentMarketPrice.toLocaleString() : "-"}</td>
                <td className={cn(tdNumCls, (r.premiumRate ?? 0) > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate != null ? `${r.premiumRate > 0 ? "+" : ""}${r.premiumRate.toFixed(1)}%` : "-"}
                </td>
                <td className={tdNumCls}>{r.saleRate != null ? `${r.saleRate.toFixed(1)}%` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}
