"use client";

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

function cycleColor(phase: MarketCycleInfo["phase"]): string {
  switch (phase) {
    case "상승": return "text-red-500";
    case "하락": return "text-blue-500";
    case "횡보": return "text-gray-500";
    case "회복": return "text-green-500";
  }
}

export function PredictionDashboard({ result, address }: DashboardProps) {
  const baseChange1y = result.currentPrice > 0
    ? ((result.predictions.base["1y"] - result.currentPrice) / result.currentPrice * 100).toFixed(1)
    : "0";
  const isPositive = parseFloat(baseChange1y) >= 0;

  return (
    <div className="space-y-4">
      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재 추정가</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPrice(result.currentPrice)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">1년 예측 (기본)</p>
          <p className={`text-xl font-bold ${isPositive ? "text-red-500" : "text-blue-500"}`}>
            {isPositive ? "+" : ""}{baseChange1y}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{formatPrice(result.predictions.base["1y"])}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">예측 신뢰도</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{result.confidence}점</p>
          <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* 시장 사이클 + 거시지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.marketCycle && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">시장 사이클</p>
            <p className={`text-lg font-bold ${cycleColor(result.marketCycle.phase)}`}>
              {result.marketCycle.phase}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {result.marketCycle.durationMonths}개월째 · 신뢰도 {result.marketCycle.confidence}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{result.marketCycle.signal}</p>
          </div>
        )}

        {result.macroFactors && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">거시 지표</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">기준금리</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.macroFactors.baseRate}%
                  {result.macroFactors.dataSource === "fallback" && (
                    <span className="text-xs text-yellow-500 ml-1">(추정)</span>
                  )}
                </span>
              </div>
              {result.macroFactors.supplyVolume && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">입주물량 (12개월)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {result.macroFactors.supplyVolume.toLocaleString()}세대
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 앙상블 모델 정보 */}
      {result.ensemble && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">예측 모델 앙상블</p>
          <div className="flex flex-wrap gap-2">
            {result.ensemble.models.filter((m) => m.weight > 0).map((model) => (
              <div
                key={model.modelName}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  model.modelName === result.ensemble!.dominantModel
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {model.modelName} ({(model.weight * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            모델 합의도: {(result.ensemble.modelAgreement * 100).toFixed(0)}% ·
            주도 모델: {result.ensemble.dominantModel}
          </p>
        </div>
      )}

      {/* 백테스팅 요약 */}
      {result.backtestResult && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">백테스팅 검증 결과</p>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">정확도</span>
              <span className="font-bold text-green-700 dark:text-green-300 ml-2">
                {result.backtestResult.accuracy12m}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">MAPE</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 ml-2">
                {result.backtestResult.mape}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">검증 기간</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 ml-2">
                {result.backtestResult.period}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
