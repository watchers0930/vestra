"use client";

import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, ShieldCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { PredictionResult, MarketCycleInfo } from "@/lib/prediction-engine";

interface DashboardProps {
  result: PredictionResult;
  address: string;
}

function formatPrice(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const man = Math.round((won % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${Math.round(won / 10000).toLocaleString()}만원`;
}

function cycleIcon(phase: MarketCycleInfo["phase"]) {
  switch (phase) {
    case "상승": return <TrendingUp size={18} className="text-red-500" />;
    case "하락": return <TrendingDown size={18} className="text-blue-500" />;
    case "횡보": return <Minus size={18} className="text-gray-400" />;
    case "회복": return <TrendingUp size={18} className="text-emerald-500" />;
  }
}

function cycleColor(phase: MarketCycleInfo["phase"]): string {
  switch (phase) {
    case "상승": return "text-red-500";
    case "하락": return "text-blue-500";
    case "횡보": return "text-gray-500";
    case "회복": return "text-emerald-500";
  }
}

// 신뢰도 게이지 SVG
function ConfidenceGauge({ score }: { score: number }) {
  const radius = 40;
  const stroke = 6;
  const circumference = Math.PI * radius; // 반원
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path
        d="M 10 55 A 40 40 0 0 1 90 55"
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M 10 55 A 40 40 0 0 1 90 55"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
      />
      <text x="50" y="48" textAnchor="middle" className="text-lg font-bold" fill="#111827" fontSize="18">
        {score}
      </text>
      <text x="50" y="58" textAnchor="middle" fill="#9ca3af" fontSize="8">
        / 100
      </text>
    </svg>
  );
}

const MODEL_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6"];
const DOMINANT_COLOR = "#111827";

export function PredictionDashboard({ result }: DashboardProps) {
  const baseChange1y = result.currentPrice > 0
    ? ((result.predictions.base["1y"] - result.currentPrice) / result.currentPrice * 100)
    : 0;
  const baseChange5y = result.currentPrice > 0
    ? ((result.predictions.base["5y"] - result.currentPrice) / result.currentPrice * 100)
    : 0;

  // 시나리오 바 차트 데이터
  const scenarioData = [
    { name: "1년", 낙관: result.predictions.optimistic["1y"], 기본: result.predictions.base["1y"], 비관: result.predictions.pessimistic["1y"] },
    { name: "5년", 낙관: result.predictions.optimistic["5y"], 기본: result.predictions.base["5y"], 비관: result.predictions.pessimistic["5y"] },
    { name: "10년", 낙관: result.predictions.optimistic["10y"], 기본: result.predictions.base["10y"], 비관: result.predictions.pessimistic["10y"] },
  ];

  // 모델 도넛 차트 데이터
  const modelData = result.ensemble?.models
    .filter((m) => m.weight > 0)
    .map((m) => ({ name: m.modelName, value: Math.round(m.weight * 100) })) ?? [];

  return (
    <div className="space-y-4">
      {/* 1행: 현재가 + 예측 변동률 + 신뢰도 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 현재 추정가 */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] text-gray-400 mb-1">현재 추정가</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">
            {formatPrice(result.currentPrice)}
          </p>
        </div>

        {/* 1년 예측 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] text-gray-400 mb-1">1년 예측</p>
          <div className="flex items-baseline gap-1.5">
            {baseChange1y >= 0
              ? <TrendingUp size={16} className="text-red-500 flex-shrink-0" />
              : <TrendingDown size={16} className="text-blue-500 flex-shrink-0" />}
            <span className={`text-xl font-bold ${baseChange1y >= 0 ? "text-red-500" : "text-blue-500"}`}>
              {baseChange1y >= 0 ? "+" : ""}{baseChange1y.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{formatPrice(result.predictions.base["1y"])}</p>
        </div>

        {/* 5년 예측 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] text-gray-400 mb-1">5년 예측</p>
          <div className="flex items-baseline gap-1.5">
            {baseChange5y >= 0
              ? <TrendingUp size={16} className="text-red-500 flex-shrink-0" />
              : <TrendingDown size={16} className="text-blue-500 flex-shrink-0" />}
            <span className={`text-xl font-bold ${baseChange5y >= 0 ? "text-red-500" : "text-blue-500"}`}>
              {baseChange5y >= 0 ? "+" : ""}{baseChange5y.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{formatPrice(result.predictions.base["5y"])}</p>
        </div>

        {/* 신뢰도 게이지 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center">
          <p className="text-[11px] text-gray-400 mb-1">신뢰도</p>
          <ConfidenceGauge score={result.confidence} />
        </div>
      </div>

      {/* 2행: 시나리오 차트 + 시장사이클 + 거시지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 시나리오별 미니 바 차트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-medium text-gray-400 mb-2">시나리오별 예측</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioData} barGap={1} barSize={10}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number | undefined) => formatPrice(value ?? 0)}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="낙관" fill="#f87171" radius={[2, 2, 0, 0]} />
                <Bar dataKey="기본" fill="#374151" radius={[2, 2, 0, 0]} />
                <Bar dataKey="비관" fill="#60a5fa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#f87171" }} />낙관</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-gray-700" />기본</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#60a5fa" }} />비관</span>
          </div>
        </div>

        {/* 시장 사이클 */}
        {result.marketCycle && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity size={14} className="text-gray-400" />
              <p className="text-[11px] font-medium text-gray-400">시장 사이클</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {cycleIcon(result.marketCycle.phase)}
              <span className={`text-lg font-bold ${cycleColor(result.marketCycle.phase)}`}>
                {result.marketCycle.phase}
              </span>
              <span className="text-[11px] text-gray-400 ml-auto">
                {result.marketCycle.durationMonths}개월째
              </span>
            </div>
            {/* 사이클 신뢰도 바 */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>사이클 신뢰도</span>
                <span>{result.marketCycle.confidence}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${result.marketCycle.confidence}%` }} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">{result.marketCycle.signal}</p>
          </div>
        )}

        {/* 거시 지표 */}
        {result.macroFactors && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 size={14} className="text-gray-400" />
              <p className="text-[11px] font-medium text-gray-400">거시 지표</p>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">기준금리</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {result.macroFactors.baseRate}%
                    {result.macroFactors.dataSource === "fallback" && (
                      <span className="text-[10px] text-amber-500 ml-1">(추정)</span>
                    )}
                  </span>
                </div>
                {/* 금리 바 시각화 (0~5% 범위) */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(result.macroFactors.baseRate / 5 * 100, 100)}%` }} />
                </div>
              </div>
              {result.macroFactors.supplyVolume != null && (
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">입주물량 (12개월)</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {result.macroFactors.supplyVolume.toLocaleString()}세대
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3행: 모델 도넛 + 백테스팅 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 앙상블 모델 도넛 차트 */}
        {result.ensemble && modelData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-medium text-gray-400 mb-2">예측 모델 가중치</p>
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      dataKey="value"
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {modelData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={entry.name === result.ensemble!.dominantModel ? DOMINANT_COLOR : MODEL_COLORS[i % MODEL_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {modelData.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.name === result.ensemble!.dominantModel ? DOMINANT_COLOR : MODEL_COLORS[i % MODEL_COLORS.length] }}
                    />
                    <span className="text-[11px] text-gray-600 flex-1">{m.name}</span>
                    <span className="text-[11px] font-medium text-gray-900">{m.value}%</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 pt-1">
                  합의도 {(result.ensemble.modelAgreement * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 백테스팅 요약 */}
        {result.backtestResult && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={14} className="text-gray-400" />
              <p className="text-[11px] font-medium text-gray-500">백테스팅 검증</p>
            </div>
            <div className="flex gap-6 mb-3">
              <div>
                <p className="text-[11px] text-gray-400">정확도</p>
                <p className="text-lg font-bold text-gray-700">{result.backtestResult.accuracy12m}%</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">MAPE</p>
                <p className="text-lg font-bold text-gray-700">{result.backtestResult.mape}%</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">검증 기간</p>
                <p className="text-lg font-bold text-gray-700">{result.backtestResult.period}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-200 pt-2">
              과거 실거래 데이터로 예측 모델을 검증한 결과입니다. 정확도는 실제 가격 대비 예측 적중률이며, MAPE(평균 절대 오차율)가 10% 이하이면 우수한 모델로 평가됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
