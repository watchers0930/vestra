"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import { BarChart3, Wallet } from "lucide-react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type {
  ScrCashFlowSummaryRow,
  ScrFundingScaleRow,
  MonthlyRow,
} from "@/lib/feasibility/scr-types";

/* ─── 표42,43: 자금흐름/조달 요약 ─── */
export function CashFlowFundingSection({
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

/* ─── 월별 테이블 ─── */
export function MonthlyTable({ rows, label }: { rows: MonthlyRow[]; label: string }) {
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

/* ─── 표44~46: 월별 자금수지 (48개월 → 16개월 × 3분할) ─── */
export function MonthlyCashFlowSection({
  parts,
}: {
  parts: { part1: MonthlyRow[]; part2: MonthlyRow[]; part3: MonthlyRow[] };
}) {
  const partLabel = (rows: MonthlyRow[], tableNo: number, start: number, end: number) => {
    const from = rows[0]?.yearMonth ?? `${start}개월차`;
    const to = rows[rows.length - 1]?.yearMonth ?? `${end}개월차`;
    return `표${tableNo}. ${start}~${end}개월 (${from} ~ ${to})`;
  };

  return (
    <ScrSection icon={BarChart3} title="표44~46. 월별 자금수지">
      {parts.part1.length === 0 && parts.part2.length === 0 && parts.part3.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#86868b]">
          월별 자금수지 데이터가 수집되지 않았습니다.
        </div>
      ) : (
        <>
          <MonthlyTable
            rows={parts.part1}
            label={partLabel(parts.part1, 44, 1, 16)}
          />
          <MonthlyTable
            rows={parts.part2}
            label={partLabel(parts.part2, 45, 17, 32)}
          />
          <MonthlyTable
            rows={parts.part3}
            label={partLabel(parts.part3, 46, 33, 48)}
          />
        </>
      )}
    </ScrSection>
  );
}

/* ─── 그림19: 기간별 사업비 누적 영역차트 ─── */
export function MonthlyCumulativeAreaChart({ parts }: { parts: { part1: MonthlyRow[]; part2: MonthlyRow[]; part3: MonthlyRow[] } }) {
  const allRows = [...parts.part1, ...parts.part2, ...parts.part3];
  if (allRows.length === 0) return null;

  let cumulative = 0;
  const chartData = allRows.map((row) => {
    const monthSpend = Object.values(row.values).reduce<number>((sum, v) => {
      if (v != null && v < 0) return sum + Math.abs(v);
      return sum;
    }, 0);
    cumulative += monthSpend;
    return {
      월: row.yearMonth,
      누적지출: cumulative,
    };
  });

  if (cumulative === 0) return null;

  return (
    <ScrSection icon={BarChart3} title="그림19. 기간별 사업비 추이" sub="월별 누적 지출">
      <div className="h-64 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="월"
              tick={{ fontSize: 10, fill: "#6e6e73" }}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6e6e73" }}
              tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}억` : `${v.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()} 만원`}
            />
            <Area
              type="monotone"
              dataKey="누적지출"
              stroke="#ef4444"
              fill="#ef444430"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ScrSection>
  );
}
