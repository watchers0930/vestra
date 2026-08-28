"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Consult } from "../hooks/useLawyerDashboard";

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const isoToKey = (iso?: string | null) => (iso ? dayKey(new Date(iso)) : null);

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** 월 캘린더 — 날짜별 상담 건수 배지, 날짜 선택 */
export function ConsultCalendar({ consults, selected, onSelect }: {
  consults: Consult[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const counts: Record<string, number> = {};
  consults.forEach((c) => { const k = isoToKey(c.preferredAt); if (k) counts[k] = (counts[k] || 0) + 1; });

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(new Date());
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-gray-100" aria-label="이전 달"><ChevronLeft size={18} /></button>
        <div className="text-sm font-bold text-gray-900">{year}년 {month + 1}월</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-gray-100" aria-label="다음 달"><ChevronRight size={18} /></button>
      </div>
      <div className="text-center" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WD.map((w, i) => <div key={w} className={`text-[11px] py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dayKey(d);
          const cnt = counts[k] || 0;
          const on = k === selected;
          const today = k === todayKey;
          return (
            <button
              key={i}
              onClick={() => onSelect(k)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[13px] transition-colors ${on ? "bg-blue-600 text-white" : today ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <span>{d.getDate()}</span>
              {cnt > 0 && (
                <span className={`text-[9.5px] font-bold mt-0.5 min-w-[16px] px-1 rounded-full ${on ? "bg-white/25 text-white" : "bg-blue-600 text-white"}`}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
