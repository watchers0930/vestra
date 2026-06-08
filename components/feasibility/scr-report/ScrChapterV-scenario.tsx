"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import { Activity, Target } from "lucide-react";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import type {
  ScrScenarioAnalysis,
  ScrBepAnalysis,
} from "@/lib/feasibility/scr-types";

/* ─── 표47~49: 시나리오 분석 ─── */
export function ScenarioSection({ data }: { data: ScrScenarioAnalysis }) {
  const scenarioColors: Record<string, string> = {
    "낙관": "#10b981",
    "기본": "#3b82f6",
    "보수": "#f59e0b",
    "비관": "#ef4444",
  };

  const chartData = data.projections.map((p) => ({
    시나리오: p.scenario,
    총수입: p.totalRevenue,
    총지출: p.totalCost,
    세전이익: p.profitBeforeTax,
  }));

  const sensitivityData = data.sensitivity.map((s) => ({
    변수: s.variable,
    이익변동: s.profitRateImpact,
  }));

  return (
    <ScrSection icon={Activity} title="표47~49. 시나리오 / 민감도 분석">
      {/* 시나리오 조건 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {data.conditions.map((c) => (
          <div
            key={c.scenario}
            className="rounded-xl p-3 text-center border"
            style={{
              borderColor: `${scenarioColors[c.scenario]}30`,
              backgroundColor: `${scenarioColors[c.scenario]}08`,
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: scenarioColors[c.scenario] }}>
              {c.scenario}
            </p>
            <p className="text-lg font-bold text-[#1d1d1f] tabular-nums">{c.saleRate}%</p>
            <p className="text-[10px] text-[#86868b] mt-0.5">{c.description}</p>
          </div>
        ))}
      </div>

      {/* 시나리오 비교 차트 */}
      <div className="h-64 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="시나리오" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}억`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()} 만원`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="총수입" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="총지출" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="세전이익" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 시나리오별 수지 테이블 */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>시나리오</th>
              <th className={cn(thCls, "text-right")}>분양률</th>
              <th className={cn(thCls, "text-right")}>총수입</th>
              <th className={cn(thCls, "text-right")}>총지출</th>
              <th className={cn(thCls, "text-right")}>세전이익</th>
              <th className={cn(thCls, "text-right")}>이익률</th>
              <th className={cn(thCls, "text-center")}>상환가능</th>
            </tr>
          </thead>
          <tbody>
            {data.projections.map((p, i) => {
              const cond = data.conditions.find((c) => c.scenario === p.scenario);
              return (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className={tdCls}>
                    <span className="font-semibold" style={{ color: scenarioColors[p.scenario] }}>
                      {p.scenario}
                    </span>
                  </td>
                  <td className={tdNumCls}>{cond?.saleRate ?? "-"}%</td>
                  <td className={tdNumCls}>{p.totalRevenue.toLocaleString()}</td>
                  <td className={tdNumCls}>{p.totalCost.toLocaleString()}</td>
                  <td className={cn(tdNumCls, p.profitBeforeTax < 0 && "text-red-500")}>
                    {p.profitBeforeTax.toLocaleString()}
                  </td>
                  <td className={cn(tdNumCls, p.profitRate < 0 && "text-red-500")}>
                    {p.profitRate.toFixed(1)}%
                  </td>
                  <td className={cn(tdCls, "text-center")}>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                      p.repaymentPossible ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {p.repaymentPossible ? "가능" : "불가"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 민감도 분석 차트 */}
      {data.sensitivity.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">민감도 분석</p>
          <div className="h-56 mb-4 print:hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensitivityData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${v}%p`} />
                <YAxis type="category" dataKey="변수" tick={{ fontSize: 11, fill: "#6e6e73" }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)}%p`}
                />
                <Bar dataKey="이익변동" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className={cn(thCls, "text-left")}>변수</th>
                  <th className={cn(thCls, "text-right")}>변동률</th>
                  <th className={cn(thCls, "text-right")}>이익 변동(만원)</th>
                  <th className={cn(thCls, "text-right")}>이익률 변동</th>
                </tr>
              </thead>
              <tbody>
                {data.sensitivity.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className={tdCls}>{s.variable}</td>
                    <td className={tdNumCls}>{s.changePercent > 0 ? "+" : ""}{s.changePercent}%</td>
                    <td className={cn(tdNumCls, s.profitImpact < 0 && "text-red-500")}>
                      {s.profitImpact.toLocaleString()}
                    </td>
                    <td className={cn(tdNumCls, s.profitRateImpact < 0 && "text-red-500")}>
                      {s.profitRateImpact > 0 ? "+" : ""}{s.profitRateImpact.toFixed(2)}%p
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ScrSection>
  );
}

/* ─── 표50~52: BEP 분석 ─── */
export function BepSection({ data }: { data: ScrBepAnalysis }) {
  return (
    <ScrSection icon={Target} title="표50~52. BEP 분양률 분석">
      {/* PF 원리금 상환 BEP */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">PF 원리금 상환 BEP</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>타입</th>
              <th className={cn(thCls, "text-right")}>BEP 분양률</th>
              <th className={cn(thCls, "text-right")}>BEP 세대수</th>
            </tr>
          </thead>
          <tbody>
            {data.pfRepaymentBep.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.type}</td>
                <td className={tdNumCls}>{r.bepSaleRate.toFixed(1)}%</td>
                <td className={tdNumCls}>{r.bepUnits.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 사업비 전체 BEP */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">사업비 전체 BEP</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>타입</th>
              <th className={cn(thCls, "text-right")}>BEP 분양률</th>
              <th className={cn(thCls, "text-right")}>BEP 세대수</th>
            </tr>
          </thead>
          <tbody>
            {data.totalCostBep.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.type}</td>
                <td className={tdNumCls}>{r.bepSaleRate.toFixed(1)}%</td>
                <td className={tdNumCls}>{r.bepUnits.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 시나리오별 BEP 요약 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">시나리오별 BEP 요약</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.scenarioBep.map((r) => (
          <div
            key={r.scenario}
            className={cn(
              "rounded-xl p-4 border text-center",
              r.margin >= 10 ? "bg-emerald-50/60 border-emerald-100" :
              r.margin >= 0 ? "bg-amber-50/60 border-amber-100" :
              "bg-red-50/60 border-red-100"
            )}
          >
            <p className="text-xs text-[#6e6e73] mb-1">{r.scenario}</p>
            <p className="text-xl font-bold text-[#1d1d1f] tabular-nums">{r.bepSaleRate.toFixed(1)}%</p>
            <p className={cn(
              "text-sm font-semibold mt-1",
              r.margin >= 10 ? "text-emerald-600" :
              r.margin >= 0 ? "text-amber-600" :
              "text-red-600"
            )}>
              여유율 {r.margin > 0 ? "+" : ""}{r.margin.toFixed(1)}%p
            </p>
          </div>
        ))}
      </div>

      {/* BEP 분양률 시각화 */}
      {data.scenarioBep.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mt-5 mb-2">그림20. BEP 분양률 vs 기준선</p>
          <div className="h-52 print:hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.scenarioBep.map((r) => ({
                  시나리오: r.scenario,
                  BEP: r.bepSaleRate,
                  margin: r.margin,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 110]}
                  tick={{ fontSize: 11, fill: "#6e6e73" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis type="category" dataKey="시나리오" tick={{ fontSize: 12, fill: "#1d1d1f", fontWeight: 600 }} width={50} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _: any, props: any) => {
                    const v = Number(value);
                    const m = props?.payload?.margin ?? 0;
                    return [`${v.toFixed(1)}% (여유 ${m > 0 ? "+" : ""}${m.toFixed(1)}%p)`, "BEP 분양률"];
                  }}
                />
                <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="BEP" radius={[0, 4, 4, 0]}>
                  {data.scenarioBep.map((r, i) => (
                    <Cell key={i} fill={r.margin >= 10 ? "#10b981" : r.margin >= 0 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 인쇄용 대체 */}
          <div className="hidden print:block mt-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {data.scenarioBep.map((r) => (
                <div key={r.scenario} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-[#6e6e73]">{r.scenario}</span>
                  <span className="font-medium tabular-nums">{r.bepSaleRate.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ScrSection>
  );
}
