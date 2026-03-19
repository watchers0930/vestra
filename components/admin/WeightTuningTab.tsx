"use client";

import { useState } from "react";
import { Sliders, RefreshCw, TrendingUp, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";
import { KpiCard } from "@/components/results";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

/**
 * 관리자 - 적응형 가중치 튜닝 탭
 * adaptive-weight-tuner의 상태를 모니터링하고 관리
 */

// 시뮬레이션 데이터
const WEIGHT_CATEGORIES = [
  { name: "등기부 파싱", weight: 0.25, alpha: 12, beta: 4 },
  { name: "위험도 스코어", weight: 0.30, alpha: 15, beta: 5 },
  { name: "교차 분석", weight: 0.20, alpha: 10, beta: 6 },
  { name: "시세 예측", weight: 0.15, alpha: 8, beta: 7 },
  { name: "사기 탐지", weight: 0.10, alpha: 6, beta: 3 },
];

const BRIER_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${30 - i}`,
  brierScore: 0.15 + Math.random() * 0.1 - i * 0.002,
  ece: 0.08 + Math.random() * 0.05 - i * 0.001,
  logLoss: 0.4 + Math.random() * 0.15 - i * 0.005,
}));

const CALIBRATION_DATA = Array.from({ length: 10 }, (_, i) => {
  const predicted = (i + 1) * 0.1;
  return {
    predicted: `${(predicted * 100).toFixed(0)}%`,
    predictedValue: predicted,
    observed: predicted + (Math.random() - 0.5) * 0.1,
  };
});

export function WeightTuningTab() {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTuning = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Brier Score" value="0.128" description="낮을수록 좋음" icon={Target} />
        <KpiCard label="ECE" value="0.054" description="보정 오차" icon={BarChart3} />
        <KpiCard label="Log Loss" value="0.341" description="예측 정확도" icon={TrendingUp} />
        <KpiCard label="피드백 건수" value="1,247" description="Thompson Sampling" icon={Sliders} />
      </div>

      {/* 현재 가중치 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sliders size={16} />
            현재 가중치 (Thompson Sampling)
          </h3>
          <Button icon={RefreshCw} size="sm" variant="secondary" loading={isRunning} onClick={handleRunTuning}>
            튜닝 실행
          </Button>
        </div>
        <div className="space-y-3">
          {WEIGHT_CATEGORIES.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-28 flex-shrink-0">{cat.name}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                  style={{ width: `${cat.weight * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-700">
                  {(cat.weight * 100).toFixed(0)}%
                </span>
              </div>
              <span className="text-[10px] text-gray-400 w-20 text-right">
                Beta({cat.alpha}, {cat.beta})
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* 메트릭 추이 */}
      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <BarChart3 size={16} />
          성능 메트릭 추이 (30일)
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={BRIER_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="brierScore" name="Brier Score" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ece" name="ECE" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="logLoss" name="Log Loss" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 캘리브레이션 곡선 */}
      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Target size={16} />
          확률 보정 곡선 (Isotonic Regression)
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CALIBRATION_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="predicted" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
              <Bar dataKey="predictedValue" name="예측 확률" fill="#93c5fd" />
              <Bar dataKey="observed" name="실제 빈도" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          예측 확률과 실제 빈도가 대각선(y=x)에 가까울수록 보정이 잘 된 모델입니다.
        </p>
      </Card>
    </div>
  );
}
