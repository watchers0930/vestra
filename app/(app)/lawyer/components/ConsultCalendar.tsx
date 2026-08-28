"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Consult, Visit } from "../hooks/useLawyerDashboard";

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const isoToKey = (iso?: string | null) => (iso ? dayKey(new Date(iso)) : null);

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** 월 캘린더 — 상담(파랑)·방문(초록) 건수를 날짜별 색 구분 배지로 표시(공동 달력). */
export function ConsultCalendar({ consults, visits = [], selected, onSelect }: {
  consults: Consult[];
  visits?: Visit[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const cCounts: Record<string, number> = {};
  const vCounts: Record<string, number> = {};
  consults.forEach((c) => { const k = isoToKey(c.preferredAt); if (k) cCounts[k] = (cCounts[k] || 0) + 1; });
  visits.forEach((v) => { const k = isoToKey(v.preferredAt); if (k) vCounts[k] = (vCounts[k] || 0) + 1; });

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

      {/* 범례 — 상담·방문 색 구분 */}
      <div className="flex items-center justify-center gap-4 mb-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-600" /> 상담</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-600" /> 방문</span>
      </div>

      <div className="text-center" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WD.map((w, i) => <div key={w} className={`text-[11px] py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dayKey(d);
          const cCnt = cCounts[k] || 0;
          const vCnt = vCounts[k] || 0;
          const on = k === selected;
          const today = k === todayKey;
          return (
            <button
              key={i}
              onClick={() => onSelect(k)}
              style={{ aspectRatio: "1 / 0.8" }}
              className={`rounded-lg flex flex-col items-center justify-center text-[13px] transition-colors ${on ? "bg-blue-600 text-white" : today ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <span>{d.getDate()}</span>
              {(cCnt > 0 || vCnt > 0) && (
                <span className="flex items-center gap-0.5 mt-0.5">
                  {cCnt > 0 && (
                    <span className={`text-[9.5px] font-bold min-w-[15px] px-1 rounded-full ${on ? "bg-white text-blue-700" : "bg-blue-600 text-white"}`}>{cCnt}</span>
                  )}
                  {vCnt > 0 && (
                    <span className={`text-[9.5px] font-bold min-w-[15px] px-1 rounded-full ${on ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"}`}>{vCnt}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
