"use client";

import { ShieldCheck, Target, BarChart3, Clock } from "lucide-react";
import type { BacktestResult } from "@/lib/prediction-engine";

interface BacktestViewProps {
  result: BacktestResult;
}

function getGradeLabel(accuracy: number): string {
  if (accuracy >= 90) return "우수";
  if (accuracy >= 80) return "양호";
  if (accuracy >= 70) return "보통";
  return "미흡";
}

export function BacktestView({ result }: BacktestViewProps) {
  return (
    <div className="space-y-4">
      {/* 정확도 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="inline-flex items-center gap-1.5 mb-3">
          <ShieldCheck size={14} className="text-gray-400" />
          <p className="text-[11px] font-medium text-gray-400">예측 정확도 (백테스팅)</p>
        </div>
        <p className="text-5xl font-bold text-gray-900 tracking-tight">
          {result.accuracy12m}<span className="text-2xl text-gray-400 font-normal">%</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          등급: <span className="font-medium text-gray-600">{getGradeLabel(result.accuracy12m)}</span>
        </p>
      </div>

      {/* 상세 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Target size={12} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">MAPE</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{result.mape}%</p>
          <p className="text-[10px] text-gray-400 mt-0.5">평균 절대 오차율</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={12} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">RMSE</p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {(result.rmse / 10000).toLocaleString()}<span className="text-xs font-normal text-gray-400">만</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">평균 제곱근 오차</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={12} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">검증 샘플</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{result.sampleCount}<span className="text-xs font-normal text-gray-400">건</span></p>
          <p className="text-[10px] text-gray-400 mt-0.5">월별 비교</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">검증 기간</p>
          </div>
          <p className="text-sm font-bold text-gray-900 mt-1">{result.period}</p>
        </div>
      </div>

      {/* 설명 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <p className="text-[11px] font-medium text-gray-500 mb-1">백테스팅이란?</p>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          과거 데이터로 모델을 학습한 뒤, 이후 실제 가격과 비교하여 예측 정확도를 검증하는 방법입니다.
          MAPE(평균 절대 오차율)가 10% 이하이면 우수한 예측 모델로 평가됩니다.
        </p>
      </div>
    </div>
  );
}
