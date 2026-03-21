"use client";

import { BarChart3 } from "lucide-react";
import type { RationalityItem } from "@/lib/feasibility/feasibility-types";
import { RATIONALITY_LABELS, RATIONALITY_COLORS } from "@/lib/feasibility/feasibility-types";

interface RationalityBandChartProps {
  items: RationalityItem[];
}

export function RationalityBandChart({ items }: RationalityBandChartProps) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
          <BarChart3 size={16} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1d1d1f]">합리성 판정 결과</h3>
          <p className="text-xs text-[#6e6e73]">벤치마크 대비 업체 주장값의 괴리 정도</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {items.map((item) => {
          const color = RATIONALITY_COLORS[item.grade];
          const label = RATIONALITY_LABELS[item.grade];
          const normalizedDeviation = Math.max(-50, Math.min(50, item.deviation));
          const barPosition = ((normalizedDeviation + 50) / 100) * 100;

          return (
            <div key={item.claimKey}>
              {/* Label row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#1d1d1f]">{item.claimLabel}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-[#6e6e73] font-mono min-w-[52px] text-right">
                    {item.deviation > 0 ? "+" : ""}
                    {item.deviation.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Band chart */}
              <div className="relative h-8 rounded-lg overflow-hidden">
                {/* Background zones */}
                <div className="absolute inset-0 flex">
                  <div className="w-[25%] bg-red-50/80" />
                  <div className="w-[15%] bg-amber-50/80" />
                  <div className="w-[20%] bg-emerald-50/80" />
                  <div className="w-[15%] bg-amber-50/80" />
                  <div className="w-[25%] bg-red-50/80" />
                </div>

                {/* Center line */}
                <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300/60" />

                {/* Zone labels */}
                <div className="absolute inset-0 flex items-center">
                  <span className="absolute left-[12%] -translate-x-1/2 text-[9px] text-red-400/60 font-medium">비현실</span>
                  <span className="absolute left-[50%] -translate-x-1/2 text-[9px] text-emerald-500/60 font-medium">적정</span>
                  <span className="absolute left-[88%] -translate-x-1/2 text-[9px] text-red-400/60 font-medium">비현실</span>
                </div>

                {/* Marker */}
                <div
                  className="absolute top-1 w-6 h-6 rounded-full border-[2.5px] border-white shadow-lg transition-all duration-700 ease-out"
                  style={{
                    left: `${barPosition}%`,
                    transform: "translateX(-50%)",
                    backgroundColor: color,
                    boxShadow: `0 2px 8px ${color}50`,
                  }}
                />
              </div>

              {/* Reasoning */}
              <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">{item.reasoning}</p>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 pt-3 border-t border-gray-100">
          {(["APPROPRIATE", "OPTIMISTIC", "CONSERVATIVE", "UNREALISTIC"] as const).map((grade) => (
            <div key={grade} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: RATIONALITY_COLORS[grade] }}
              />
              <span className="text-[11px] text-[#6e6e73]">{RATIONALITY_LABELS[grade]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
