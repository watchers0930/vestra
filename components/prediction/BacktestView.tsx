"use client";

import type { BacktestResult } from "@/lib/prediction-engine";

interface BacktestViewProps {
  result: BacktestResult;
}

function getGradeColor(accuracy: number): string {
  if (accuracy >= 90) return "text-green-500";
  if (accuracy >= 80) return "text-blue-500";
  if (accuracy >= 70) return "text-yellow-500";
  return "text-red-500";
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
      {/* 정확도 요약 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">예측 정확도 (백테스팅)</p>
        <p className={`text-4xl font-bold ${getGradeColor(result.accuracy12m)}`}>
          {result.accuracy12m}%
        </p>
        <p className={`text-sm mt-1 ${getGradeColor(result.accuracy12m)}`}>
          {getGradeLabel(result.accuracy12m)}
        </p>
      </div>

      {/* 상세 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">MAPE</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{result.mape}%</p>
          <p className="text-[10px] text-gray-400">평균 절대 오차율</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">RMSE</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {(result.rmse / 10000).toLocaleString()}만
          </p>
          <p className="text-[10px] text-gray-400">평균 제곱근 오차</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">검증 샘플</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{result.sampleCount}건</p>
          <p className="text-[10px] text-gray-400">월별 비교</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">검증 기간</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{result.period}</p>
        </div>
      </div>

      {/* 설명 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">백테스팅이란?</p>
        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
          과거 데이터로 모델을 학습한 뒤, 이후 실제 가격과 비교하여 예측 정확도를 검증하는 방법입니다.
          MAPE(평균 절대 오차율)가 10% 이하이면 우수한 예측 모델로 평가됩니다.
        </p>
      </div>
    </div>
  );
}
