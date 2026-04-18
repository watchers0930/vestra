"use client";

import { analyzeRisk } from "../lib/analyzeRisk";
import type { AptData } from "../types";

interface Props {
  popup: { apt: AptData; risk: ReturnType<typeof analyzeRisk> };
  selectedGu: string;
  onClose: () => void;
}

export function RiskPopup({ popup, selectedGu, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{popup.apt.name}</h3>
            <p className="text-xs text-gray-500">{popup.apt.dong} · {popup.apt.area}평 · {popup.apt.year}년</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 py-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={popup.risk.color} strokeWidth="3"
                strokeDasharray={`${popup.risk.score} ${100 - popup.risk.score}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold" style={{ color: popup.risk.color }}>{popup.risk.score}</span>
              <span className="text-[9px] text-gray-400">/ 100</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">종합 안전 점수</p>
            <p className="text-xl font-bold" style={{ color: popup.risk.color }}>{popup.risk.grade}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">공공데이터 기반 자동 분석 결과</p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <h4 className="mb-3 text-xs font-bold text-gray-700">항목별 분석</h4>
          <div className="space-y-3">
            {popup.risk.items.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.level === "안전" ? "bg-green-100 text-green-700" :
                    item.level === "주의" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>{item.level}</span>
                </div>
                <p className="text-xs font-bold text-gray-900">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-[10px] text-gray-400 text-center">
            ※ 본 분석은 공공데이터 기반 자동 산출 결과이며, 투자 판단의 근거로 사용할 수 없습니다.
            정확한 분석을 위해 등기부등본 확인을 권장합니다.
          </p>
          <a
            href={`/rights?address=${encodeURIComponent(`서울특별시 ${selectedGu} ${popup.apt.dong}`)}`}
            className="mt-3 block w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            등기부등본으로 정밀 분석하기 →
          </a>
        </div>
      </div>
    </div>
  );
}
