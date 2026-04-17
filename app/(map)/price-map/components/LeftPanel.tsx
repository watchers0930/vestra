"use client";

import { MapPin, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { analyzeRisk } from "../lib/analyzeRisk";
import { SIDO_MAP } from "../constants";
import type { AptData } from "../types";

interface Props {
  selectedGu: string;
  setSelectedGu: (gu: string) => void;
  selectedApt: AptData | null;
  loading: boolean;
  showGuDropdown: boolean;
  setShowGuDropdown: (v: boolean) => void;
  selectedSido: string;
  setSelectedSido: (s: string) => void;
  tradeType: "매매" | "전세";
  setTradeType: (t: "매매" | "전세") => void;
  topChanges: AptData[];
  selectAndMoveToApt: (apt: AptData) => void;
  setRiskPopup: (v: { apt: AptData; risk: ReturnType<typeof analyzeRisk> } | null) => void;
}

export function LeftPanel({
  selectedGu, setSelectedGu, selectedApt, loading,
  showGuDropdown, setShowGuDropdown, selectedSido, setSelectedSido,
  tradeType, setTradeType, topChanges, selectAndMoveToApt, setRiskPopup,
}: Props) {
  return (
    <div className="h-full w-[280px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white pr-3 py-1" style={{ paddingLeft: "4px" }}>
      {/* 구 선택 + 필터 */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowGuDropdown(!showGuDropdown)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              {selectedGu}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showGuDropdown && (
            <div className="absolute z-20 mt-1 flex rounded-lg border border-gray-200 bg-white shadow-lg" style={{ width: "360px" }}>
              <div className="w-[100px] shrink-0 border-r border-gray-100 overflow-y-auto max-h-64">
                <p className="sticky top-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">시도</p>
                {Object.keys(SIDO_MAP).map((sido) => (
                  <button
                    key={sido}
                    onClick={() => setSelectedSido(sido)}
                    className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-indigo-50 ${sido === selectedSido ? "bg-indigo-100 font-bold text-indigo-600" : "text-gray-700"}`}
                  >
                    {sido}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto max-h-64">
                <p className="sticky top-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">시군구</p>
                {(SIDO_MAP[selectedSido] || []).map((gu) => (
                  <button
                    key={gu}
                    onClick={() => { setSelectedGu(gu); setShowGuDropdown(false); }}
                    className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-indigo-50 ${gu === selectedGu ? "bg-indigo-50 font-semibold text-indigo-600" : "text-gray-700"}`}
                  >
                    {gu}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-300">
          <button onClick={() => setTradeType("매매")} className={`px-3 py-2 text-xs font-medium ${tradeType === "매매" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-l-lg`}>매매</button>
          <button onClick={() => setTradeType("전세")} className={`px-3 py-2 text-xs font-medium ${tradeType === "전세" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-r-lg`}>전세</button>
        </div>
      </div>

      {/* 상승 예측 TOP */}
      <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 p-3">
        <h3 className="mb-1 text-xs font-bold text-gray-900">{selectedGu}, 최근 1년 시세 변동 TOP</h3>
        <p className="mb-2 text-[10px] leading-relaxed text-amber-600">국토부 실거래 신고 기준<br />최근 정책 변동 미반영 (1~2개월 지연)</p>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white/60" />)}</div>
        ) : (
          <div className="space-y-1.5">
            {topChanges.map((apt, i) => (
              <button
                key={apt.name}
                onClick={() => selectAndMoveToApt(apt)}
                className={`flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left shadow-sm transition hover:shadow-md ${selectedApt?.name === apt.name ? "ring-2 ring-indigo-500" : ""}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900">{apt.name}</p>
                  <p className="text-[10px] text-gray-500">{apt.area}평 · {apt.year}년</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{formatPrice(apt.price)}</p>
                  <p className={`text-[10px] font-semibold ${(apt.change ?? 0) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {apt.change !== null ? `${apt.change >= 0 ? "+" : ""}${apt.change}%` : "-"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 선택된 아파트 상세 */}
      {selectedApt && (
        <div className="rounded-xl border border-indigo-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900">{selectedApt.name}</h4>
            {selectedApt.change !== null ? (
              <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedApt.change >= 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                {selectedApt.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {selectedApt.change >= 0 ? "+" : ""}{selectedApt.change}%
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">데이터 부족</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">시세</p><p className="text-xs font-bold">{formatPrice(selectedApt.price)}</p></div>
            <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">면적</p><p className="text-xs font-bold">{selectedApt.area}평</p></div>
            <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">건축</p><p className="text-xs font-bold">{selectedApt.year}년</p></div>
            <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">법정동</p><p className="text-xs font-bold">{selectedApt.dong}</p></div>
          </div>
          <button
            onClick={() => setRiskPopup({ apt: selectedApt, risk: analyzeRisk(selectedApt) })}
            className="mt-2 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
          >
            위험도 분석 →
          </button>
        </div>
      )}
    </div>
  );
}
