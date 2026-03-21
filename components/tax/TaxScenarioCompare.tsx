"use client";

import { useState } from "react";
import { GitCompareArrows, ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import {
  calculateAcquisitionTax,
  calculateHoldingTax,
  calculateTransferTax,
  getTaxConfig,
  type TaxConfig,
} from "@/lib/tax-calculator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, Alert } from "@/components/common";
import { SliderInput } from "@/components/forms";
import { InfoRow } from "@/components/results";

type ScenarioType = "sell_now_vs_later" | "gift_vs_sale" | "custom";

interface ScenarioConfig {
  label: string;
  description: string;
  scenarioA: ScenarioParams;
  scenarioB: ScenarioParams;
}

interface ScenarioParams {
  label: string;
  price: number;
  assessedValue: number;
  acquisitionPrice: number;
  transferPrice: number;
  holdingYears: number;
  livingYears: number;
  houseCount: number;
  isAdjusted: boolean;
  isFirstHome: boolean;
  taxYear: number;
}

const DEFAULT_PARAMS: ScenarioParams = {
  label: "시나리오 A",
  price: 850000000,
  assessedValue: 600000000,
  acquisitionPrice: 600000000,
  transferPrice: 900000000,
  holdingYears: 3,
  livingYears: 2,
  houseCount: 1,
  isAdjusted: false,
  isFirstHome: false,
  taxYear: 2026,
};

const PRESET_SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  sell_now_vs_later: {
    label: "지금 팔면 vs 2년 후",
    description: "현재 매도와 2년 후 매도 시 양도세 차이를 비교합니다.",
    scenarioA: {
      ...DEFAULT_PARAMS,
      label: "지금 매도",
      holdingYears: 3,
      livingYears: 2,
    },
    scenarioB: {
      ...DEFAULT_PARAMS,
      label: "2년 후 매도",
      holdingYears: 5,
      livingYears: 4,
      transferPrice: 950000000,
    },
  },
  gift_vs_sale: {
    label: "증여 vs 매매",
    description: "가족 간 증여와 매매 시 세금 부담을 비교합니다.",
    scenarioA: {
      ...DEFAULT_PARAMS,
      label: "증여 (취득세 기준)",
      price: 600000000,
      houseCount: 2,
    },
    scenarioB: {
      ...DEFAULT_PARAMS,
      label: "매매 (양도세 기준)",
      houseCount: 1,
    },
  },
  custom: {
    label: "직접 비교",
    description: "원하는 조건을 직접 입력하여 비교합니다.",
    scenarioA: { ...DEFAULT_PARAMS, label: "시나리오 A" },
    scenarioB: { ...DEFAULT_PARAMS, label: "시나리오 B" },
  },
};

function computeAllTaxes(params: ScenarioParams, config: TaxConfig) {
  const acq = calculateAcquisitionTax(
    {
      price: params.price,
      houseCount: params.houseCount,
      isAdjusted: params.isAdjusted,
      isFirstHome: params.isFirstHome,
    },
    config
  );

  const hold = calculateHoldingTax(
    {
      assessedValue: params.assessedValue,
      houseCount: params.houseCount,
      isAdjusted: params.isAdjusted,
    },
    config
  );

  const transfer = calculateTransferTax(
    {
      acquisitionPrice: params.acquisitionPrice,
      transferPrice: params.transferPrice,
      holdingYears: params.holdingYears,
      livingYears: params.livingYears,
      houseCount: params.houseCount,
      isAdjusted: params.isAdjusted,
    },
    config
  );

  return {
    acquisitionTax: acq.totalTax || acq.tax,
    acquisitionLabel: acq.label,
    holdingTax: hold.totalTax,
    transferTax: transfer.totalTax || transfer.tax || 0,
    transferDetails: transfer.details,
    totalTax:
      (acq.totalTax || acq.tax) +
      hold.totalTax +
      (transfer.totalTax || transfer.tax || 0),
  };
}

function ScenarioInputPanel({
  params,
  onChange,
  accent,
}: {
  params: ScenarioParams;
  onChange: (p: ScenarioParams) => void;
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#1d1d1f]">{params.label}</h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
        >
          {expanded ? "접기" : "상세 설정"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <SliderInput
        label="매매가격"
        value={params.price}
        onChange={(v) => onChange({ ...params, price: v, transferPrice: v })}
        min={50000000}
        max={5000000000}
        step={10000000}
      />

      <div className="grid grid-cols-2 gap-3">
        <SliderInput
          label="보유기간"
          value={params.holdingYears}
          onChange={(v) => onChange({ ...params, holdingYears: v, livingYears: Math.min(params.livingYears, v) })}
          min={0}
          max={30}
          step={1}
          formatValue={(v) => `${v}년`}
        />
        <SliderInput
          label="거주기간"
          value={params.livingYears}
          onChange={(v) => onChange({ ...params, livingYears: v })}
          min={0}
          max={params.holdingYears}
          step={1}
          formatValue={(v) => `${v}년`}
        />
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => onChange({ ...params, houseCount: n })}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
              params.houseCount === n
                ? accent === "blue"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-violet-500 text-white border-violet-500"
                : "bg-white text-[#6e6e73] border-[#e5e5e7] hover:bg-gray-50"
            )}
          >
            {n}주택
          </button>
        ))}
      </div>

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-[#e5e5e7]">
          <SliderInput
            label="공시가격"
            value={params.assessedValue}
            onChange={(v) => onChange({ ...params, assessedValue: v })}
            min={50000000}
            max={5000000000}
            step={10000000}
          />
          <SliderInput
            label="취득가격"
            value={params.acquisitionPrice}
            onChange={(v) => onChange({ ...params, acquisitionPrice: v })}
            min={50000000}
            max={5000000000}
            step={10000000}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.isAdjusted}
                onChange={(e) => onChange({ ...params, isAdjusted: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">조정대상지역</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.isFirstHome}
                onChange={(e) => onChange({ ...params, isFirstHome: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">생애최초</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaxScenarioCompare() {
  const [scenarioType, setScenarioType] = useState<ScenarioType>("sell_now_vs_later");
  const [scenarioA, setScenarioA] = useState<ScenarioParams>(
    PRESET_SCENARIOS.sell_now_vs_later.scenarioA
  );
  const [scenarioB, setScenarioB] = useState<ScenarioParams>(
    PRESET_SCENARIOS.sell_now_vs_later.scenarioB
  );

  const handlePresetChange = (type: ScenarioType) => {
    setScenarioType(type);
    const preset = PRESET_SCENARIOS[type];
    setScenarioA(preset.scenarioA);
    setScenarioB(preset.scenarioB);
  };

  const configA = getTaxConfig(scenarioA.taxYear);
  const configB = getTaxConfig(scenarioB.taxYear);
  const resultA = computeAllTaxes(scenarioA, configA);
  const resultB = computeAllTaxes(scenarioB, configB);

  const diff = resultA.totalTax - resultB.totalTax;

  const comparisonChartData = [
    {
      name: "취득세",
      [scenarioA.label]: resultA.acquisitionTax,
      [scenarioB.label]: resultB.acquisitionTax,
    },
    {
      name: "보유세(연)",
      [scenarioA.label]: resultA.holdingTax,
      [scenarioB.label]: resultB.holdingTax,
    },
    {
      name: "양도세",
      [scenarioA.label]: resultA.transferTax,
      [scenarioB.label]: resultB.transferTax,
    },
    {
      name: "합계",
      [scenarioA.label]: resultA.totalTax,
      [scenarioB.label]: resultB.totalTax,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 프리셋 선택 */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(PRESET_SCENARIOS) as [ScenarioType, ScenarioConfig][]).map(
          ([key, config]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                scenarioType === key
                  ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                  : "bg-white text-[#6e6e73] border-[#e5e5e7] hover:bg-gray-50"
              )}
            >
              {config.label}
            </button>
          )
        )}
      </div>

      <p className="text-sm text-[#6e6e73]">
        {PRESET_SCENARIOS[scenarioType].description}
      </p>

      {/* 시나리오 입력 (2열) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <ScenarioInputPanel params={scenarioA} onChange={setScenarioA} accent="blue" />
        </Card>
        <Card className="p-5">
          <ScenarioInputPanel params={scenarioB} onChange={setScenarioB} accent="violet" />
        </Card>
      </div>

      {/* 비교 차트 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <GitCompareArrows size={20} strokeWidth={1.5} className="text-[#1d1d1f]" />
          시나리오 비교
        </h3>
        <div className="h-[200px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`} />
              <Tooltip
                formatter={(value) => [formatKRW(Number(value)), ""]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar
                dataKey={scenarioA.label}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey={scenarioB.label}
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 비교 테이블 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">상세 비교</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e7]">
                <th className="py-3 text-left text-[#6e6e73] font-medium">항목</th>
                <th className="py-3 text-right font-medium text-blue-600">
                  {scenarioA.label}
                </th>
                <th className="py-3 text-right font-medium text-violet-600">
                  {scenarioB.label}
                </th>
                <th className="py-3 text-right text-[#6e6e73] font-medium">차이</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-[#6e6e73]">취득세</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultA.acquisitionTax)}</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultB.acquisitionTax)}</td>
                <td className={cn(
                  "py-3 text-right font-semibold",
                  resultA.acquisitionTax > resultB.acquisitionTax ? "text-red-500" : "text-emerald-500"
                )}>
                  {resultA.acquisitionTax === resultB.acquisitionTax
                    ? "-"
                    : `${resultA.acquisitionTax > resultB.acquisitionTax ? "+" : "-"}${formatKRW(Math.abs(resultA.acquisitionTax - resultB.acquisitionTax))}`}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-[#6e6e73]">보유세 (연간)</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultA.holdingTax)}</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultB.holdingTax)}</td>
                <td className={cn(
                  "py-3 text-right font-semibold",
                  resultA.holdingTax > resultB.holdingTax ? "text-red-500" : "text-emerald-500"
                )}>
                  {resultA.holdingTax === resultB.holdingTax
                    ? "-"
                    : `${resultA.holdingTax > resultB.holdingTax ? "+" : "-"}${formatKRW(Math.abs(resultA.holdingTax - resultB.holdingTax))}`}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-[#6e6e73]">양도세</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultA.transferTax)}</td>
                <td className="py-3 text-right font-semibold">{formatKRW(resultB.transferTax)}</td>
                <td className={cn(
                  "py-3 text-right font-semibold",
                  resultA.transferTax > resultB.transferTax ? "text-red-500" : "text-emerald-500"
                )}>
                  {resultA.transferTax === resultB.transferTax
                    ? "-"
                    : `${resultA.transferTax > resultB.transferTax ? "+" : "-"}${formatKRW(Math.abs(resultA.transferTax - resultB.transferTax))}`}
                </td>
              </tr>
              <tr className="border-t-2 border-[#1d1d1f]">
                <td className="py-3 font-semibold text-[#1d1d1f]">세금 합계</td>
                <td className="py-3 text-right font-bold text-blue-600">{formatKRW(resultA.totalTax)}</td>
                <td className="py-3 text-right font-bold text-violet-600">{formatKRW(resultB.totalTax)}</td>
                <td className={cn(
                  "py-3 text-right font-bold",
                  diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-[#6e6e73]"
                )}>
                  {diff === 0
                    ? "동일"
                    : `${diff > 0 ? "+" : "-"}${formatKRW(Math.abs(diff))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {diff !== 0 && (
          <Alert variant="info" className="mt-4">
            <span className="text-xs">
              <strong>{diff > 0 ? scenarioB.label : scenarioA.label}</strong>이(가){" "}
              <strong>{formatKRW(Math.abs(diff))}</strong> 더 유리합니다.
            </span>
          </Alert>
        )}
      </Card>
    </div>
  );
}
