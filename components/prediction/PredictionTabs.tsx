"use client";

import { useState } from "react";

export type PredictionTabId = "dashboard" | "chart" | "compare" | "backtest" | "anomaly";

interface Tab {
  id: PredictionTabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "chart", label: "차트" },
  { id: "compare", label: "지역 비교" },
  { id: "backtest", label: "백테스트" },
  { id: "anomaly", label: "이상탐지" },
];

interface PredictionTabsProps {
  activeTab: PredictionTabId;
  onTabChange: (tab: PredictionTabId) => void;
  disabledTabs?: PredictionTabId[];
}

export function PredictionTabs({ activeTab, onTabChange, disabledTabs = [] }: PredictionTabsProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
      {TABS.map((tab) => {
        const isDisabled = disabledTabs.includes(tab.id);
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`
              px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
              border-b-2 -mb-px
              ${isActive
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }
              ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
