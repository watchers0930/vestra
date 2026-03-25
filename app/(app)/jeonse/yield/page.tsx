"use client";

import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatKRW, formatNumber, parseNumber } from "@/lib/format";

export default function RentalYieldPage() {
  const [form, setForm] = useState({
    purchasePrice: 500_000_000,
    deposit: 100_000_000,
    monthlyRent: 1_000_000,
    maintenanceFee: 200_000,
    vacancyRate: 5,
    annualTax: 500_000,
    annualRepair: 300_000,
  });

  type FormKey = keyof typeof form;
  const update = (key: FormKey, value: number) =>
    setForm((p) => ({ ...p, [key]: value }));

  const result = useMemo(() => {
    const {
      purchasePrice,
      deposit,
      monthlyRent,
      maintenanceFee,
      vacancyRate,
      annualTax,
      annualRepair,
    } = form;

    const investment = purchasePrice - deposit;
    if (investment <= 0) return null;
    if (monthlyRent <= 0) return null;

    const annualRentIncome = monthlyRent * 12 * (1 - vacancyRate / 100);
    const annualExpenses = annualTax + annualRepair;
    const netIncome = annualRentIncome - annualExpenses;
    const yieldRate = (netIncome / investment) * 100;
    const monthlyNetIncome = netIncome / 12;
    const paybackYears = investment / netIncome;

    return {
      annualRentIncome,
      annualExpenses,
      netIncome,
      investment,
      yieldRate,
      monthlyNetIncome,
      paybackYears,
      maintenanceFee,
    };
  }, [form]);

  const pieData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "순수익", value: Math.max(0, result.netIncome) },
      { name: "보유세/재산세", value: form.annualTax },
      { name: "수선비", value: form.annualRepair },
      {
        name: "공실 손실",
        value: form.monthlyRent * 12 * (form.vacancyRate / 100),
      },
    ].filter((d) => d.value > 0);
  }, [result, form]);

  const PIE_COLORS = ["#4f46e5", "#f59e0b", "#ef4444", "#9ca3af"];

  const yieldColor = (rate: number) => {
    if (rate >= 5) return "text-green-600";
    if (rate >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const yieldBg = (rate: number) => {
    if (rate >= 5) return "from-green-50 to-emerald-50 border-green-200";
    if (rate >= 3) return "from-yellow-50 to-amber-50 border-yellow-200";
    return "from-red-50 to-rose-50 border-red-200";
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">
            임대 수익률 계산기
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          매매가 대비 월세 수익률을 계산합니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">
          물건 · 임대 정보
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              매매가
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.purchasePrice)}
              onChange={(e) =>
                update("purchasePrice", parseNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.purchasePrice)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              보증금
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.deposit)}
              onChange={(e) => update("deposit", parseNumber(e.target.value))}
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.deposit)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              월세
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.monthlyRent)}
              onChange={(e) =>
                update("monthlyRent", parseNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.monthlyRent)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              관리비
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.maintenanceFee)}
              onChange={(e) =>
                update("maintenanceFee", parseNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.maintenanceFee)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              공실률 (%)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.vacancyRate}
              onChange={(e) => {
                const v = Math.min(30, Math.max(0, Number(e.target.value)));
                update("vacancyRate", v);
              }}
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              0~30% 범위
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              보유세/재산세 연간
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.annualTax)}
              onChange={(e) =>
                update("annualTax", parseNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.annualTax)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              수선비 연간
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.annualRepair)}
              onChange={(e) =>
                update("annualRepair", parseNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.annualRepair)}
            </p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {form.purchasePrice <= form.deposit && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            매매가가 보증금보다 커야 합니다. 투자금(매매가 - 보증금)이 0 이하입니다.
          </p>
        </div>
      )}
      {form.monthlyRent <= 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            월세는 0보다 커야 합니다.
          </p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <>
          {/* 총 수익률 요약 */}
          <div
            className={`rounded-xl border bg-gradient-to-r p-5 ${yieldBg(result.yieldRate)}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 수익률</p>
                <p
                  className={`text-3xl font-bold ${yieldColor(result.yieldRate)}`}
                >
                  {result.yieldRate.toFixed(2)}%
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {result.yieldRate >= 5
                    ? "우수한 수익률입니다"
                    : result.yieldRate >= 3
                      ? "보통 수준의 수익률입니다"
                      : "수익률이 낮은 편입니다"}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500">월 순수익</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {formatKRW(Math.round(result.monthlyNetIncome))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">연간 순수익</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {formatKRW(Math.round(result.netIncome))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">투자금 회수</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {result.paybackYears > 0
                      ? `${result.paybackYears.toFixed(1)}년`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 내역 + 차트 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 상세 내역 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-gray-900">
                상세 내역
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">투자금 (매매가 - 보증금)</span>
                  <span className="font-semibold">
                    {formatKRW(result.investment)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">연간 월세 수입</span>
                  <span className="font-semibold text-green-600">
                    {formatKRW(Math.round(result.annualRentIncome))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    공실 손실 ({form.vacancyRate}%)
                  </span>
                  <span className="font-semibold text-red-500">
                    -
                    {formatKRW(
                      Math.round(
                        form.monthlyRent * 12 * (form.vacancyRate / 100)
                      )
                    )}
                  </span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">보유세/재산세</span>
                  <span className="font-semibold text-red-500">
                    -{formatKRW(form.annualTax)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">수선비</span>
                  <span className="font-semibold text-red-500">
                    -{formatKRW(form.annualRepair)}
                  </span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900">연간 순수익</span>
                  <span
                    className={
                      result.netIncome >= 0
                        ? "text-indigo-600"
                        : "text-red-600"
                    }
                  >
                    {formatKRW(Math.round(result.netIncome))}
                  </span>
                </div>
              </div>
            </div>

            {/* 파이 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-gray-900">
                수입/비용 비율
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => formatKRW(Math.round(Number(value)))}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-10">
                  데이터가 없습니다
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            본 계산 결과는 참고용이며 실제 수익률과 차이가 있을 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
