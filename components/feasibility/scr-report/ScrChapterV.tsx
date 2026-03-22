"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import {
  TrendingUp, BarChart3, Wallet, Target, Activity, Calculator,
} from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrRepaymentAnalysis,
  ScrPeriodSaleRateRow,
  ScrBusinessIncome,
  ScrCashFlowSummaryRow,
  ScrFundingScaleRow,
  ScrScenarioAnalysis,
  ScrBepAnalysis,
  MonthlyRow,
} from "@/lib/feasibility/scr-types";

interface ScrChapterVProps {
  data: ScrRepaymentAnalysis;
}


/* ─── 표40: 기간별 분양률 ─── */
function PeriodSaleRateTable({ rows }: { rows: ScrPeriodSaleRateRow[] }) {
  return (
    <ScrSection icon={TrendingUp} title="표40. 기간별 분양률">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>기간</th>
              <th className={cn(thCls, "text-right")}>단기 분양률</th>
              <th className={cn(thCls, "text-right")}>누적 분양률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.period}</td>
                <td className={tdNumCls}>{r.shortTermRate.toFixed(1)}%</td>
                <td className={tdNumCls}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, r.cumulativeRate)}%` }}
                      />
                    </div>
                    <span>{r.cumulativeRate.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표41: 사업수지 ─── */
function BusinessIncomeSection({ data }: { data: ScrBusinessIncome }) {
  const revenueRows = [
    ["아파트", data.revenue.apartment],
    ["오피스텔", data.revenue.officetel],
    ["발코니확장", data.revenue.balconyExpansion],
    ["상가", data.revenue.commercial],
    ["중도금이자", data.revenue.interimInterest],
    ["부가세", data.revenue.vat],
    ["수입 합계", data.revenue.total],
  ];

  const costRows = [
    ["토지비", data.cost.land],
    ["직접공사비", data.cost.directConstruction],
    ["간접공사비", data.cost.indirectConstruction],
    ["분양경비", data.cost.salesExpense],
    ["일반관리비", data.cost.generalAdmin],
    ["제세공과금", data.cost.tax],
    ["PF 수수료", data.cost.pfFee],
    ["PF 이자", data.cost.pfInterest],
    ["중도금이자", data.cost.interimInterest],
    ["지출 합계", data.cost.total],
  ];

  return (
    <ScrSection icon={Calculator} title="표41. 사업수지">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 수입 */}
        <div>
          <p className="text-xs font-semibold text-emerald-600 mb-2">수입</p>
          <div className="rounded-xl bg-gray-50/80 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {revenueRows.map(([label, value], i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-gray-100/80 last:border-0",
                      i === revenueRows.length - 1 && "bg-emerald-50/80 font-bold"
                    )}
                  >
                    <td className="py-2 px-4 text-[#6e6e73]">{label}</td>
                    <td className="py-2 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                      {(value as number).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 지출 */}
        <div>
          <p className="text-xs font-semibold text-red-600 mb-2">지출</p>
          <div className="rounded-xl bg-gray-50/80 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {costRows.map(([label, value], i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-gray-100/80 last:border-0",
                      i === costRows.length - 1 && "bg-red-50/80 font-bold"
                    )}
                  >
                    <td className="py-2 px-4 text-[#6e6e73]">{label}</td>
                    <td className="py-2 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                      {(value as number).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 세전이익 요약 */}
      <div className="mt-4 rounded-xl bg-blue-50/80 border border-blue-100 p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1d1d1f]">세전이익</span>
        <div className="text-right">
          <span className={cn("text-lg font-bold tabular-nums", data.profitBeforeTax >= 0 ? "text-blue-600" : "text-red-500")}>
            {data.profitBeforeTax.toLocaleString()} 만원
          </span>
          <span className="ml-2 text-sm text-[#6e6e73]">({data.profitRate.toFixed(1)}%)</span>
        </div>
      </div>
    </ScrSection>
  );
}

/* ─── 표42,43: 자금흐름/조달 요약 ─── */
function CashFlowFundingSection({
  summary,
  funding,
}: {
  summary: ScrCashFlowSummaryRow[];
  funding: ScrFundingScaleRow[];
}) {
  return (
    <ScrSection icon={Wallet} title="표42~43. 자금흐름 요약 / 자금조달">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 자금흐름 요약 */}
        <div>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">주요 자금흐름</p>
          <div className="rounded-xl bg-gray-50/80 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {summary.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100/80 last:border-0">
                    <td className="py-2 px-4 text-[#6e6e73]">{r.item}</td>
                    <td className="py-2 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                      {r.amount.toLocaleString()} 만원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 자금조달 */}
        <div>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">자금조달 규모</p>
          <div className="rounded-xl bg-gray-50/80 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {funding.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100/80 last:border-0">
                    <td className="py-2 px-4 text-[#6e6e73]">{r.source}</td>
                    <td className="py-2 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                      {r.amount.toLocaleString()} 만원
                    </td>
                    <td className="py-2 px-4 text-right text-xs text-[#86868b] tabular-nums">{r.ratio.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ScrSection>
  );
}

/* ─── 월별 테이블 (파일 스코프) ─── */
function MonthlyTable({ rows, label }: { rows: MonthlyRow[]; label: string }) {
  if (!rows.length) return null;
  const keys = rows.length > 0 ? Object.keys(rows[0].values) : [];
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">{label}</p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left sticky left-0 bg-gray-50/80 z-10")}>연월</th>
              {keys.map((k) => (
                <th key={k} className={cn(thCls, "text-right")}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={cn(tdCls, "sticky left-0 bg-white z-10")}>{r.yearMonth}</td>
                {keys.map((k) => (
                  <td key={k} className={cn(tdNumCls, (r.values[k] ?? 0) < 0 && "text-red-500")}>
                    {r.values[k] != null ? r.values[k]!.toLocaleString() : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 표44~46: 월별 자금수지 ─── */
function MonthlyCashFlowSection({
  parts,
}: {
  parts: { part1: MonthlyRow[]; part2: MonthlyRow[]; part3: MonthlyRow[] };
}) {
  return (
    <ScrSection icon={BarChart3} title="표44~46. 월별 자금수지">
      <MonthlyTable rows={parts.part1} label="Part 1" />
      <MonthlyTable rows={parts.part2} label="Part 2" />
      <MonthlyTable rows={parts.part3} label="Part 3" />
    </ScrSection>
  );
}

/* ─── 표47~49: 시나리오 분석 ─── */
function ScenarioSection({ data }: { data: ScrScenarioAnalysis }) {
  const scenarioColors: Record<string, string> = {
    "낙관": "#10b981",
    "기본": "#3b82f6",
    "보수": "#f59e0b",
    "비관": "#ef4444",
  };

  // 시나리오 비교 차트 데이터
  const chartData = data.projections.map((p) => ({
    시나리오: p.scenario,
    총수입: p.totalRevenue,
    총지출: p.totalCost,
    세전이익: p.profitBeforeTax,
  }));

  // 민감도 차트 데이터
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
function BepSection({ data }: { data: ScrBepAnalysis }) {
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
    </ScrSection>
  );
}

/* ─── 메인 V장 컴포넌트 ─── */
export function ScrChapterV({ data }: ScrChapterVProps) {
  return (
    <div className="space-y-5">
      {/* 전제사항 */}
      {data.assumptions && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-[#1d1d1f]">전제사항 및 기본 가정</h4>
          </div>
          <div className="p-5">
            <p className="text-sm text-[#424245] leading-relaxed whitespace-pre-line">{data.assumptions}</p>
          </div>
        </div>
      )}

      <PeriodSaleRateTable rows={data.periodSaleRate} />
      <BusinessIncomeSection data={data.businessIncome} />
      <CashFlowFundingSection summary={data.cashFlowSummary} funding={data.fundingScale} />
      <MonthlyCashFlowSection parts={data.monthlyCashFlow} />
      <ScenarioSection data={data.scenario} />
      <BepSection data={data.bep} />
    </div>
  );
}
