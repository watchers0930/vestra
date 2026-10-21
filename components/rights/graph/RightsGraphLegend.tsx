"use client";

/** 권리관계 그래프 범례 — 색상 외 텍스트 라벨로도 노드 종류를 구분 (설계 §4.8) */
import { cn } from "@/lib/utils";
import { NODE_COLORS, NODE_TYPE_LABELS } from "./graph-types";

export function RightsGraphLegend() {
  return (
    <div className="flex flex-wrap gap-2 px-1" role="list" aria-label="노드 종류 범례">
      {Object.entries(NODE_COLORS).map(([type, colors]) => (
        <div key={type} className="flex items-center gap-1" role="listitem">
          <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} aria-hidden />
          <span className="text-[10px] text-gray-500">{NODE_TYPE_LABELS[type]}</span>
        </div>
      ))}
    </div>
  );
}
