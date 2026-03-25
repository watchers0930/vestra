"use client";

import { useState, useMemo } from "react";
import { Truck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatKRW, formatNumber, parseNumber } from "@/lib/format";

type MovingType = "포장이사" | "반포장이사" | "일반이사";
type DistanceType = "같은 구" | "같은 시" | "타 시도";
type DealType = "전세" | "매매";

function calcMovingCost(
  movingType: MovingType,
  distance: DistanceType,
  pyeong: number,
): number {
  const base: Record<MovingType, { fixed: number; perPyeong: number }> = {
    포장이사: { fixed: 500_000, perPyeong: 30_000 },
    반포장이사: { fixed: 300_000, perPyeong: 20_000 },
    일반이사: { fixed: 200_000, perPyeong: 15_000 },
  };
  const distMult: Record<DistanceType, number> = {
    "같은 구": 1,
    "같은 시": 1.3,
    "타 시도": 1.8,
  };
  const { fixed, perPyeong } = base[movingType];
  return Math.round((fixed + perPyeong * pyeong) * distMult[distance]);
}

function calcBrokerFee(price: number, dealType: DealType): number {
  if (dealType === "전세") {
    if (price < 50_000_000) return Math.min(price * 0.005, 200_000);
    if (price < 100_000_000) return Math.min(price * 0.004, 300_000);
    if (price < 600_000_000) return price * 0.003;
    return price * 0.004;
  }
  // 매매
  if (price < 50_000_000) return Math.min(price * 0.006, 250_000);
  if (price < 200_000_000) return Math.min(price * 0.005, 800_000);
  if (price < 900_000_000) return price * 0.004;
  return price * 0.005; // 9억 이상 0.5%~0.9% 중 0.5% 적용
}

function getBrokerRateLabel(price: number, dealType: DealType): string {
  if (dealType === "전세") {
    if (price < 50_000_000) return "0.5% (한도 20만)";
    if (price < 100_000_000) return "0.4% (한도 30만)";
    if (price < 600_000_000) return "0.3%";
    return "0.4%";
  }
  if (price < 50_000_000) return "0.6% (한도 25만)";
  if (price < 200_000_000) return "0.5% (한도 80만)";
  if (price < 900_000_000) return "0.4%";
  return "0.5%~0.9%";
}

export default function MovingCostPage() {
  const [form, setForm] = useState({
    movingType: "포장이사" as MovingType,
    distance: "같은 구" as DistanceType,
    pyeong: 25,
    price: 300_000_000,
    dealType: "전세" as DealType,
  });
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  const result = useMemo(() => {
    if (!calculated) return null;

    const movingCost = calcMovingCost(
      form.movingType,
      form.distance,
      form.pyeong,
    );
    const brokerFee = calcBrokerFee(form.price, form.dealType);
    const confirmDateFee = 600;
    const moveInFee = 0;
    const totalEtc = confirmDateFee + moveInFee;
    const total = movingCost + brokerFee + totalEtc;

    return {
      movingCost,
      brokerFee,
      brokerRateLabel: getBrokerRateLabel(form.price, form.dealType),
      confirmDateFee,
      moveInFee,
      totalEtc,
      total,
    };
  }, [calculated, form]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "이사 비용", 금액: result.movingCost },
      { name: "중개수수료", 금액: result.brokerFee },
      { name: "기타 비용", 금액: result.totalEtc },
    ];
  }, [result]);

  const handleCalculate = () => {
    setError(null);
    if (form.pyeong <= 0) {
      setError("평수를 1 이상 입력해주세요.");
      return;
    }
    if (form.price <= 0) {
      setError("매매가 또는 보증금을 입력해주세요.");
      return;
    }
    setCalculated(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">
            이사 비용 계산기
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          이사 업체 견적 + 중개수수료 + 세금을 한번에 계산합니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">이사 정보 입력</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              이사 유형
            </label>
            <select
              value={form.movingType}
              onChange={(e) => {
                update("movingType", e.target.value as MovingType);
                setCalculated(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="포장이사">포장이사</option>
              <option value="반포장이사">반포장이사</option>
              <option value="일반이사">일반이사</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              이사 거리
            </label>
            <select
              value={form.distance}
              onChange={(e) => {
                update("distance", e.target.value as DistanceType);
                setCalculated(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="같은 구">같은 구</option>
              <option value="같은 시">같은 시</option>
              <option value="타 시도">타 시도</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              평수
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.pyeong)}
              onChange={(e) => {
                update("pyeong", parseNumber(e.target.value));
                setCalculated(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              매매가 또는 전세 보증금
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.price)}
              onChange={(e) => {
                update("price", parseNumber(e.target.value));
                setCalculated(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.price)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              거래 유형
            </label>
            <select
              value={form.dealType}
              onChange={(e) => {
                update("dealType", e.target.value as DealType);
                setCalculated(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="전세">전세</option>
              <option value="매매">매매</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto sm:px-8"
        >
          비용 계산하기
        </button>
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
          {/* 총 예상 비용 */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">
                  총 예상 비용
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(result.total)}원
                </p>
                <p className="text-xs text-gray-500">
                  {formatKRW(result.total)}
                </p>
              </div>
            </div>
          </div>

          {/* 항목별 비용 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">
              항목별 비용 내역
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-xs font-medium text-gray-500">
                      항목
                    </th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500">
                      비용
                    </th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500">
                      비고
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2.5 text-gray-700">이사 비용</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      {formatNumber(result.movingCost)}원
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-500">
                      {form.movingType} / {form.distance} / {form.pyeong}평
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-700">중개수수료</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      {formatNumber(result.brokerFee)}원
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-500">
                      {form.dealType} {result.brokerRateLabel}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-700">전입신고</td>
                    <td className="py-2.5 text-right font-semibold text-green-600">
                      무료
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-500">
                      주민센터/온라인
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-700">확정일자</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      {formatNumber(result.confirmDateFee)}원
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-500">
                      주민센터/등기소
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2.5 font-bold text-gray-900">합계</td>
                    <td className="py-2.5 text-right font-bold text-indigo-600">
                      {formatNumber(result.total)}원
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 차트 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">
              비용 구성 차트
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => formatKRW(v)}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [
                      `${formatNumber(Number(value))}원`,
                      "금액",
                    ]}
                  />
                  <Bar dataKey="금액" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            본 계산 결과는 추정치이며, 실제 비용은 업체 및 상황에 따라 달라질 수
            있습니다.
          </p>
        </>
      )}
    </div>
  );
}
