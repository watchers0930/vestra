"use client";

import React from "react";

/* ─── 공용 테이블 셀 스타일 ─── */
export const thCls =
  "py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider";
export const tdCls = "py-3 px-4 text-sm text-[#1d1d1f]";
export const tdNumCls =
  "py-3 px-4 text-sm text-[#1d1d1f] text-right tabular-nums font-medium";

/* ─── 공용 차트 색상 ─── */
export const CHART_COLORS = {
  primary: "#0071e3",
  secondary: "#34c759",
  tertiary: "#ff9500",
  danger: "#ff3b30",
  muted: "#8e8e93",
} as const;

/* ─── 섹션 카드 래퍼 ─── */
export function ScrSection({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
          <Icon size={16} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#1d1d1f]">{title}</h4>
          {sub && <p className="text-xs text-[#86868b]">{sub}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── 빈 데이터 안내 ─── */
export function EmptyDataNotice({ message }: { message?: string }) {
  return (
    <div className="py-8 text-center text-sm text-[#86868b]">
      {message || "데이터가 수집되지 않았습니다."}
    </div>
  );
}

/* ─── 금액 포맷 유틸 ─── */
export function formatAmount(value: number | undefined | null, unit = ""): string {
  if (value === undefined || value === null) return "-";
  return `${value.toLocaleString("ko-KR")}${unit}`;
}

/* ─── 퍼센트 포맷 유틸 ─── */
export function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null) return "-";
  return `${value.toFixed(decimals)}%`;
}
