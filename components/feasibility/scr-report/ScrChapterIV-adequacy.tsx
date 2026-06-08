"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import { Scale, MessageSquare } from "lucide-react";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type {
  ScrAdequacyOpinion,
  ScrPremiumRow,
} from "@/lib/feasibility/scr-types";

/* ─── 표37: 프리미엄 분석 ─── */
export function PremiumTable({ rows }: { rows: ScrPremiumRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">표37. 분양사례 프리미엄</p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-right")}>분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>현재가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.complexName}</td>
                <td className={tdNumCls}>{r.salePricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentPricePerPyeong.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.premiumAmount > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumAmount > 0 ? "+" : ""}{r.premiumAmount.toLocaleString()}
                </td>
                <td className={cn(tdNumCls, r.premiumRate > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate > 0 ? "+" : ""}{r.premiumRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 표38,39: 적정성 의견 ─── */
export function AdequacyOpinionSection({ data }: { data: ScrAdequacyOpinion }) {
  return (
    <ScrSection icon={Scale} title="표38~39. 분양가 적정성 의견">
      {/* 계획 분양가 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">본건 계획 분양가</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>타입</th>
              <th className={cn(thCls, "text-right")}>평당가(만원)</th>
              <th className={cn(thCls, "text-right")}>총분양가(만원)</th>
            </tr>
          </thead>
          <tbody>
            {data.plannedPrice.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.type}</td>
                <td className={tdNumCls}>{r.pricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.totalPrice.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 비교대상 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">주요 비교대상</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>비교대상</th>
              <th className={cn(thCls, "text-right")}>평당가(만원)</th>
              <th className={cn(thCls, "text-right")}>차이(만원/평)</th>
              <th className={cn(thCls, "text-right")}>차이율</th>
            </tr>
          </thead>
          <tbody>
            {data.comparison.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.target}</td>
                <td className={tdNumCls}>{r.pricePerPyeong.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.gap > 0 ? "text-red-500" : "text-emerald-600")}>
                  {r.gap > 0 ? "+" : ""}{r.gap.toLocaleString()}
                </td>
                <td className={cn(tdNumCls, r.gapRate > 0 ? "text-red-500" : "text-emerald-600")}>
                  {r.gapRate > 0 ? "+" : ""}{r.gapRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 비교가격 바차트 */}
      {data.comparison.length > 0 && data.plannedPrice.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">그림16. 분양가 비교</p>
          <div className="h-52 mb-5 print:hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "본건", price: data.plannedPrice[0].pricePerPyeong },
                  ...data.comparison.map((c) => ({ name: c.target, price: c.pricePerPyeong })),
                ]}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6e6e73" }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6e6e73" }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toLocaleString()} 만원/평`, "평당가"]}
                />
                <ReferenceLine
                  x={data.plannedPrice[0].pricePerPyeong}
                  stroke="#0071e3"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                  {[data.plannedPrice[0], ...data.comparison].map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#0071e3" : "#6e6e73"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 종합 의견 */}
      <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare size={13} className="text-blue-500" />
          <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">적정성 종합 의견</span>
        </div>
        <p className="text-sm text-[#424245] leading-relaxed">{data.conclusion}</p>
      </div>
    </ScrSection>
  );
}
