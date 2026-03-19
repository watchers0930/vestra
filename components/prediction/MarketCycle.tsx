"use client";

import type { MarketCycleInfo } from "@/lib/prediction-engine";

interface MarketCycleProps {
  cycle: MarketCycleInfo;
}

const PHASE_CONFIG = {
  "상승": { color: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: "↗" },
  "하락": { color: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: "↘" },
  "횡보": { color: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", icon: "→" },
  "회복": { color: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", icon: "↗" },
};

export function MarketCycleView({ cycle }: MarketCycleProps) {
  const config = PHASE_CONFIG[cycle.phase];

  return (
    <div className={`rounded-lg p-6 ${config.color}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-3xl ${config.text}`}>{config.icon}</span>
        <div>
          <h3 className={`text-xl font-bold ${config.text}`}>시장 사이클: {cycle.phase}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {cycle.durationMonths}개월째 지속 · 신뢰도 {cycle.confidence}%
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300">{cycle.signal}</p>

      <div className="mt-4 flex gap-2">
        {(["상승", "회복", "횡보", "하락"] as const).map((phase) => (
          <div
            key={phase}
            className={`flex-1 h-2 rounded-full ${
              phase === cycle.phase
                ? "bg-current opacity-100"
                : "bg-gray-200 dark:bg-gray-700 opacity-50"
            }`}
            style={phase === cycle.phase ? { backgroundColor: phase === "상승" ? "#ef4444" : phase === "하락" ? "#3b82f6" : phase === "회복" ? "#22c55e" : "#9ca3af" } : {}}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>상승</span><span>회복</span><span>횡보</span><span>하락</span>
      </div>
    </div>
  );
}
