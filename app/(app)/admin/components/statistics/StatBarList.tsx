"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/common";
import type { NameValue } from "@/lib/ga4-reports";

interface Props {
  title: string;
  icon: LucideIcon;
  items: NameValue[];
  unit?: string;
  /** 표시 이름 가공 (예: 경로 정리) */
  formatName?: (name: string) => string;
  emptyText?: string;
}

const BAR_COLOR = "#2e4bd8";

export function StatBarList({ title, icon: Icon, items, unit = "", formatName, emptyText = "데이터 없음" }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Icon size={16} strokeWidth={1.5} />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[#9e9e9e] py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const label = formatName ? formatName(item.name) : item.name;
            const pct = Math.round((item.value / max) * 100);
            return (
              <div key={`${item.name}-${idx}`} className="flex items-center gap-3">
                <div className="w-[42%] shrink-0 truncate text-xs text-[#4b4b4f]" title={label}>
                  {label || "(없음)"}
                </div>
                <div className="relative flex-1 h-5 rounded-md bg-[#f2f4fb] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: BAR_COLOR, opacity: 0.85 }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-xs font-semibold text-[#1d1d1f] tabular-nums">
                  {item.value.toLocaleString()}
                  {unit}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
