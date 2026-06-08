"use client";

import { cn } from "@/lib/utils";
import { ScrSection, EmptyDataNotice, NarrativeBlock, thCls, tdCls, tdNumCls } from "./scr-shared";
import { TrendingUp, Calculator, Wallet } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrRepaymentAnalysis,
  ScrPeriodSaleRateRow,
  ScrBusinessIncome,
} from "@/lib/feasibility/scr-types";
import {
  CashFlowFundingSection,
  MonthlyCashFlowSection,
  MonthlyCumulativeAreaChart,
} from "./ScrChapterV-cashflow";
import { ScenarioSection, BepSection } from "./ScrChapterV-scenario";

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

/* ─── 그림17: 수입·지출 항목별 적층 바차트 ─── */
function RevenueExpenseStackedChart({ data }: { data: ScrBusinessIncome }) {
  const chartData = [
    {
      name: "수입",
      아파트: data.revenue.apartment,
      오피스텔: data.revenue.officetel,
      발코니: data.revenue.balconyExpansion,
      상가: data.revenue.commercial,
      중도금이자: data.revenue.interimInterest,
      부가세: data.revenue.vat,
    },
    {
      name: "지출",
      토지비: data.cost.land,
      직접공사비: data.cost.directConstruction,
      간접공사비: data.cost.indirectConstruction,
      분양경비: data.cost.salesExpense,
      일반관리비: data.cost.generalAdmin,
      "PF이자": data.cost.pfInterest,
      기타: data.cost.tax + data.cost.pfFee + data.cost.interimInterest,
    },
  ];

  const revenueKeys = ["아파트", "오피스텔", "발코니", "상가", "중도금이자", "부가세"];
  const expenseKeys = ["토지비", "직접공사비", "간접공사비", "분양경비", "일반관리비", "PF이자", "기타"];
  const allKeys = [...revenueKeys, ...expenseKeys];
  const colors = ["#0071e3", "#5856d6", "#30b0c7", "#34c759", "#ff9500", "#8e8e93",
    "#ff3b30", "#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#6366f1", "#a3a3a3"];

  if (data.revenue.total === 0 && data.cost.total === 0) return null;

  return (
    <ScrSection icon={Calculator} title="그림17. 수입·지출 비교" sub="항목별 구성">
      <div className="h-72 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6e6e73" }}
              tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}억` : `${v.toLocaleString()}`}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#1d1d1f", fontWeight: 600 }} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value, name) => [`${Number(value).toLocaleString()} 만원`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {allKeys.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={colors[i % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* 인쇄 대체: 수입/지출 합계 비교 */}
      <div className="hidden print:block">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-600 mb-1">총수입</p>
            <p className="text-lg font-bold tabular-nums">{data.revenue.total.toLocaleString()} 만원</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-600 mb-1">총지출</p>
            <p className="text-lg font-bold tabular-nums">{data.cost.total.toLocaleString()} 만원</p>
          </div>
        </div>
      </div>
    </ScrSection>
  );
}

/* ─── 그림18: 사업비 구성 파이차트 ─── */
const PIE_COLORS = ["#0071e3", "#34c759", "#ff9500", "#ff3b30", "#8e8e93", "#5856d6", "#af52de", "#007aff", "#30b0c7"];

function BusinessCostPieChart({ data }: { data: ScrBusinessIncome }) {
  const costItems = [
    { name: "토지비", value: data.cost.land },
    { name: "직접공사비", value: data.cost.directConstruction },
    { name: "간접공사비", value: data.cost.indirectConstruction },
    { name: "분양경비", value: data.cost.salesExpense },
    { name: "일반관리비", value: data.cost.generalAdmin },
    { name: "제세공과금", value: data.cost.tax },
    { name: "PF 수수료", value: data.cost.pfFee },
    { name: "PF 이자", value: data.cost.pfInterest },
    { name: "중도금이자", value: data.cost.interimInterest },
  ].filter((item) => item.value > 0);

  if (costItems.length === 0) return null;

  return (
    <ScrSection icon={Calculator} title="그림18. 사업비 구성" sub="지출 항목별 비중">
      <div className="h-72 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={costItems}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={(props: any) => `${String(props.name ?? "")} ${(((props.percent as number) ?? 0) * 100).toFixed(1)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {costItems.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()} 만원`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* 인쇄용 대체 */}
      <div className="hidden print:block">
        <div className="grid grid-cols-3 gap-2">
          {costItems.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-[#6e6e73]">{item.name}</span>
              <span className="ml-auto font-medium tabular-nums">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
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

      {data.periodSaleRate.length > 0 ? (
        <PeriodSaleRateTable rows={data.periodSaleRate} />
      ) : (
        <ScrSection icon={TrendingUp} title="표40. 기간별 분양률">
          <EmptyDataNotice message="기간별 분양률 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      <BusinessIncomeSection data={data.businessIncome} />
      <RevenueExpenseStackedChart data={data.businessIncome} />
      <BusinessCostPieChart data={data.businessIncome} />

      {data.incomeNarrative && <NarrativeBlock text={data.incomeNarrative} />}

      {data.cashFlowSummary.length > 0 || data.fundingScale.length > 0 ? (
        <CashFlowFundingSection summary={data.cashFlowSummary} funding={data.fundingScale} />
      ) : (
        <ScrSection icon={Wallet} title="표42~43. 자금흐름 요약 / 자금조달">
          <EmptyDataNotice message="자금흐름 및 자금조달 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}
      <MonthlyCashFlowSection parts={data.monthlyCashFlow} />
      <MonthlyCumulativeAreaChart parts={data.monthlyCashFlow} />

      {data.cashflowNarrative && <NarrativeBlock text={data.cashflowNarrative} />}

      <ScenarioSection data={data.scenario} />
      <BepSection data={data.bep} />

      {data.scenarioNarrative && <NarrativeBlock text={data.scenarioNarrative} />}

      {data.overallConclusion && (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-6 print:border-blue-300">
          <h4 className="text-sm font-bold text-[#1d1d1f] mb-3">종합 의견</h4>
          <p className="text-sm text-[#1d1d1f] leading-[1.8] whitespace-pre-line">{data.overallConclusion}</p>
        </div>
      )}
    </div>
  );
}
