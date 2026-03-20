"use client";

import { useState, useEffect, useCallback } from "react";
import { Sliders, RefreshCw, TrendingUp, BarChart3, Target, Loader2 } from "lucide-react";
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

interface WeightData {
  current: {
    weights: Record<string, number>;
    betaParams: Record<string, { alpha: number; beta: number }>;
    brierScore: number;
    logLoss: number;
    ece: number;
    feedbackCount: number;
    improvement: number;
    confidence: number;
    updatedAt: string | null;
  };
  history: Array<{ day: string; brierScore: number; logLoss: number; ece: number }>;
  calibration: Array<{ predicted: string; predictedValue: number; observed: number; count: number }>;
  totalFeedbacks: number;
}

export function WeightTuningTab() {
  const [data, setData] = useState<WeightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tuning, setTuning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/weight-tuning");
      if (!res.ok) throw new Error("데이터 로딩 실패");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRunTuning = async () => {
    setTuning(true);
    try {
      const res = await fetch("/api/admin/weight-tuning", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "튜닝 실패");
      } else {
        await fetchData();
      }
    } catch {
      setError("튜닝 실행 중 오류");
    } finally {
      setTuning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#86868b]" size={24} />
      </div>
    );
  }

  const current = data?.current;
  const weights = current?.weights || {};
  const betaParams = current?.betaParams || {};
  const history = data?.history || [];
  const calibration = data?.calibration || [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Brier Score"
          value={current?.brierScore ? current.brierScore.toFixed(3) : "-"}
          description="낮을수록 좋음"
          icon={Target}
        />
        <KpiCard
          label="ECE"
          value={current?.ece ? current.ece.toFixed(3) : "-"}
          description="보정 오차"
          icon={BarChart3}
        />
        <KpiCard
          label="Log Loss"
          value={current?.logLoss ? current.logLoss.toFixed(3) : "-"}
          description="예측 정확도"
          icon={TrendingUp}
        />
        <KpiCard
          label="피드백 건수"
          value={data?.totalFeedbacks?.toLocaleString() || "0"}
          description="Thompson Sampling"
          icon={Sliders}
        />
      </div>

      {/* 현재 가중치 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sliders size={16} />
            현재 가중치 (Thompson Sampling)
          </h3>
          <Button icon={RefreshCw} size="sm" variant="secondary" loading={tuning} onClick={handleRunTuning}>
            튜닝 실행
          </Button>
        </div>

        {Object.keys(weights).length === 0 ? (
          <p className="text-sm text-[#86868b]">아직 가중치 설정이 없습니다. 피드백 데이터가 쌓이면 튜닝을 실행할 수 있습니다.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(weights).map(([name, weight]) => {
              const beta = betaParams[name] as { alpha: number; beta: number } | undefined;
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28 flex-shrink-0">{name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                      style={{ width: `${(weight as number) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-700">
                      {((weight as number) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 w-20 text-right">
                    {beta ? `Beta(${beta.alpha}, ${beta.beta})` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {current?.updatedAt && (
          <p className="text-[10px] text-gray-400 mt-3">
            마지막 업데이트: {new Date(current.updatedAt).toLocaleString("ko-KR")}
            {current.improvement !== 0 && ` | 성능 향상: ${current.improvement > 0 ? "+" : ""}${current.improvement.toFixed(1)}%`}
          </p>
        )}
      </Card>

      {/* 메트릭 추이 */}
      {history.length > 1 && (
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 size={16} />
            성능 메트릭 추이
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(history.length / 8))} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="brierScore" name="Brier Score" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ece" name="ECE" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="logLoss" name="Log Loss" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 캘리브레이션 곡선 */}
      {calibration.some((c) => c.count > 0) && (
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Target size={16} />
            확률 보정 곡선 (Isotonic Regression)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calibration}>
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
      )}
    </div>
  );
}
