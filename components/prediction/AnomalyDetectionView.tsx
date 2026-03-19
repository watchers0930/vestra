"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/utils";
import { Card } from "@/components/common";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ComposedChart,
  Line,
} from "recharts";

/**
 * 시계열 이상탐지 시각화 컴포넌트
 * anomaly-detector의 Bollinger Band + 변화점 시각화
 */

interface Transaction {
  dealAmount: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
}

interface Props {
  transactions: Transaction[];
  currentPrice: number;
}

// 간단한 Bollinger Band 계산 (클라이언트 사이드)
function calculateBands(values: number[], window: number = 10) {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
    const cv = mean !== 0 ? std / Math.abs(mean) : 0;
    const multiplier = 2.0 * (1 + cv);

    middle.push(mean);
    upper.push(mean + multiplier * std);
    lower.push(mean - multiplier * std);
  }
  return { upper, lower, middle };
}

// MAD 기반 이상치 탐지
function detectAnomalies(values: number[]) {
  if (values.length < 3) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const devs = values.map(v => Math.abs(v - median));
  const sortedDevs = [...devs].sort((a, b) => a - b);
  const mad = sortedDevs[Math.floor(sortedDevs.length / 2)];
  if (mad === 0) return [];

  return values.map((v, i) => ({
    index: i,
    score: Math.abs(0.6745 * (v - median) / mad),
    isAnomaly: Math.abs(0.6745 * (v - median) / mad) > 3.0,
    direction: v > median ? "spike" : "dip",
  }));
}

// CUSUM 변화점
function detectChangePoints(values: number[]) {
  if (values.length < 5) return [];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const h = 4 * std;
  const k = 0.5 * std;
  const points: number[] = [];
  let sPlus = 0, sMinus = 0;

  for (let i = 0; i < values.length; i++) {
    sPlus = Math.max(0, sPlus + (values[i] - mean - k));
    sMinus = Math.max(0, sMinus - (values[i] - mean) + k);
    if (sPlus > h || sMinus > h) {
      points.push(i);
      sPlus = 0;
      sMinus = 0;
    }
  }
  return points;
}

export function AnomalyDetectionView({ transactions, currentPrice }: Props) {
  const chartData = useMemo(() => {
    if (!transactions?.length) return { data: [], anomalies: [], changePoints: [] };

    const sorted = [...transactions].sort(
      (a, b) => a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay
        - (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
    );

    const values = sorted.map(t => t.dealAmount);
    const bands = calculateBands(values);
    const anomalyResults = detectAnomalies(values);
    const changePointIndices = detectChangePoints(values);

    const data = sorted.map((t, i) => ({
      date: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}`,
      price: t.dealAmount,
      upper: bands.upper[i],
      lower: bands.lower[i],
      middle: bands.middle[i],
      isAnomaly: anomalyResults[i]?.isAnomaly || false,
      isChangePoint: changePointIndices.includes(i),
    }));

    const anomalies = data.filter(d => d.isAnomaly);
    const changePoints = data.filter(d => d.isChangePoint);

    return { data, anomalies, changePoints };
  }, [transactions]);

  if (!transactions?.length || transactions.length < 3) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={16} />
          <h3 className="font-semibold text-sm">이상탐지 분석</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">
          이상탐지 분석을 위해 최소 3건 이상의 거래 데이터가 필요합니다
        </p>
      </Card>
    );
  }

  const { data, anomalies, changePoints } = chartData;

  // 추세 요약
  const values = data.map(d => d.price);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const trendDirection = secondAvg > firstAvg * 1.05 ? "up" : secondAvg < firstAvg * 0.95 ? "down" : "stable";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={16} strokeWidth={1.5} />
          이상탐지 분석
        </h3>
        <div className="flex items-center gap-2">
          {anomalies.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 font-medium">
              이상치 {anomalies.length}건
            </span>
          )}
          {changePoints.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 font-medium">
              변화점 {changePoints.length}건
            </span>
          )}
          <span className={cn(
            "px-2 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1",
            trendDirection === "up" ? "bg-emerald-100 text-emerald-700" :
            trendDirection === "down" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-700"
          )}>
            {trendDirection === "up" ? <TrendingUp size={10} /> : trendDirection === "down" ? <TrendingDown size={10} /> : null}
            {trendDirection === "up" ? "상승 추세" : trendDirection === "down" ? "하락 추세" : "안정"}
          </span>
        </div>
      </div>

      {/* Bollinger Band 차트 */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(1)}억`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  price: "거래가", upper: "상한밴드", lower: "하한밴드", middle: "이동평균"
                };
                return [formatKRW(Number(value)), labels[String(name)] || String(name)];
              }}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#fee2e2" fillOpacity={0.5} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="white" fillOpacity={1} />
            <Line type="monotone" dataKey="middle" stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="upper" stroke="#fca5a5" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="lower" stroke="#fca5a5" strokeWidth={1} dot={false} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isAnomaly: boolean; isChangePoint: boolean } };
                if (payload?.isAnomaly) {
                  return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                }
                if (payload?.isChangePoint) {
                  return <circle cx={cx} cy={cy} r={5} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />;
                }
                return <circle cx={cx} cy={cy} r={2} fill="#2563eb" />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <span className="text-[10px] text-gray-500">실거래가</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-gray-400" style={{ borderTop: "2px dashed #9ca3af" }} />
          <span className="text-[10px] text-gray-500">이동평균</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
          <span className="text-[10px] text-gray-500">Bollinger Band</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-[10px] text-gray-500">이상치</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-[10px] text-gray-500">변화점</span>
        </div>
      </div>

      {/* 이상치 목록 */}
      {anomalies.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1">
            <AlertTriangle size={12} />
            감지된 이상 거래
          </h4>
          {anomalies.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
              <span className="text-red-600 font-medium">{a.date}</span>
              <span className="text-gray-600">{formatKRW(a.price)}</span>
              <span className="text-red-500 text-[10px]">
                (정상 범위: {formatKRW(a.lower)} ~ {formatKRW(a.upper)})
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
