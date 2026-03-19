"use client";

import type { MacroEconomicFactors } from "@/lib/prediction-engine";

interface MacroIndicatorsProps {
  factors: MacroEconomicFactors;
}

export function MacroIndicators({ factors }: MacroIndicatorsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">거시경제 지표</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">한국은행 기준금리</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{factors.baseRate}%</p>
          <p className="text-[10px] text-gray-400">
            {factors.dataSource === "live" ? `기준일: ${factors.baseRateDate}` : "추정값 사용"}
          </p>
        </div>

        {factors.supplyVolume && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              입주예정물량 ({factors.supplyRegion})
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {factors.supplyVolume.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400">향후 12개월</p>
          </div>
        )}
      </div>
    </div>
  );
}
