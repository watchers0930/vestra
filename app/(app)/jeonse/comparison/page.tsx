"use client";

import { useState, useMemo } from "react";
import { Home } from "lucide-react";
import { formatKRW, formatNumber, parseNumber } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function JeonseComparisonPage() {
  const [form, setForm] = useState({
    jeonseDeposit: 300_000_000,
    wolseDeposit: 50_000_000,
    monthlyRent: 800_000,
    loanRate: 3.5,
    period: 2,
    investReturn: 5,
  });
  const [error, setError] = useState<string | null>(null);

  type FormKey = keyof typeof form;
  const update = (key: FormKey, value: number) =>
    setForm((p) => ({ ...p, [key]: value }));

  const result = useMemo(() => {
    try {
      setError(null);

      const {
        jeonseDeposit,
        wolseDeposit,
        monthlyRent,
        loanRate,
        period,
        investReturn,
      } = form;

      if (jeonseDeposit <= 0 || wolseDeposit < 0 || monthlyRent <= 0) {
        setError("보증금과 월세 금액은 0보다 커야 합니다.");
        return null;
      }

      if (loanRate < 0 || loanRate > 20) {
        setError("대출 금리는 0~20% 사이로 입력해주세요.");
        return null;
      }

      if (investReturn < 0 || investReturn > 30) {
        setError("투자 수익률은 0~30% 사이로 입력해주세요.");
        return null;
      }

      // 전세 총 비용 = 대출이자 + 기회비용(보증금 × 투자수익률)
      const jeonseLoanInterest =
        jeonseDeposit * (loanRate / 100) * period;
      const jeonseOpportunityCost =
        jeonseDeposit * (investReturn / 100) * period;
      const jeonseTotalCost = jeonseLoanInterest + jeonseOpportunityCost;

      // 월세 총 비용 = 월세 × 12 × 거주기간 + 기회비용(보증금 × 투자수익률)
      const wolseTotalRent = monthlyRent * 12 * period;
      const wolseOpportunityCost =
        wolseDeposit * (investReturn / 100) * period;
      const wolseTotalCost = wolseTotalRent + wolseOpportunityCost;

      const diff = Math.abs(jeonseTotalCost - wolseTotalCost);
      const isBetter = jeonseTotalCost <= wolseTotalCost ? "jeonse" : "wolse";

      return {
        jeonseLoanInterest,
        jeonseOpportunityCost,
        jeonseTotalCost,
        wolseTotalRent,
        wolseOpportunityCost,
        wolseTotalCost,
        diff,
        isBetter,
      };
    } catch {
      setError("계산 중 오류가 발생했습니다.");
      return null;
    }
  }, [form]);

  const chartData = result
    ? [
        { name: "전세 총 비용", value: result.jeonseTotalCost, fill: "#4f46e5" },
        { name: "월세 총 비용", value: result.wolseTotalCost, fill: "#f59e0b" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">
            전세 vs 월세 비교 시뮬레이터
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          전세와 월세의 실질 비용을 비교하여 유리한 선택을 확인합니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">비교 조건 입력</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              전세 보증금
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.jeonseDeposit)}
              onChange={(e) =>
                update("jeonseDeposit", parseNumber(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.jeonseDeposit)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              월세 보증금
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.wolseDeposit)}
              onChange={(e) =>
                update("wolseDeposit", parseNumber(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.wolseDeposit)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              월세 금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.monthlyRent)}
              onChange={(e) =>
                update("monthlyRent", parseNumber(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.monthlyRent)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              전세대출 금리 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.loanRate}
              onChange={(e) =>
                update("loanRate", parseFloat(e.target.value) || 0)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              거주 기간 (년)
            </label>
            <select
              value={form.period}
              onChange={(e) => update("period", Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              투자 수익률 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.investReturn}
              onChange={(e) =>
                update("investReturn", parseFloat(e.target.value) || 0)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <>
          {/* 결론 요약 */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">비교 결과</p>
                <p className="text-lg font-bold text-gray-900">
                  {result.isBetter === "jeonse"
                    ? "전세가 유리합니다"
                    : "월세가 유리합니다"}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">차이 금액</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {formatKRW(result.diff)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">거주 기간</p>
                  <p className="text-lg font-bold text-green-600">
                    {form.period}년
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 차트 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              비용 비교 차트
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      `${(v / 10000).toLocaleString()}만`
                    }
                  />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip
                    formatter={(value) => [
                      formatKRW(Number(value)),
                      "총 비용",
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 상세 비교 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 전세 비용 상세 */}
            <div className="rounded-xl border border-indigo-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-indigo-600">
                전세 총 비용
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">대출 이자</span>
                  <span className="font-semibold">
                    {formatKRW(result.jeonseLoanInterest)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">기회비용</span>
                  <span className="font-semibold">
                    {formatKRW(result.jeonseOpportunityCost)}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-gray-900">합계</span>
                  <span className="font-bold text-indigo-600">
                    {formatKRW(result.jeonseTotalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* 월세 비용 상세 */}
            <div className="rounded-xl border border-amber-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-amber-600">
                월세 총 비용
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">월세 합계</span>
                  <span className="font-semibold">
                    {formatKRW(result.wolseTotalRent)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">기회비용</span>
                  <span className="font-semibold">
                    {formatKRW(result.wolseOpportunityCost)}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-gray-900">합계</span>
                  <span className="font-bold text-amber-600">
                    {formatKRW(result.wolseTotalCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 면책 조항 */}
          <p className="text-center text-xs text-gray-400">
            본 시뮬레이션은 단순 비교 목적의 참고 자료이며, 실제 비용은 대출 조건,
            세금, 관리비 등에 따라 달라질 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
