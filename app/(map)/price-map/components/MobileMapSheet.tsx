"use client";

import { useState, useRef, useCallback } from "react";
import { MapPin, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
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

const RANK_COLORS = ["#0071e3", "#1a9e45", "#b86f00"];
const PEEK_HEIGHT = 64;
const EXPANDED_HEIGHT_VH = 55;

export function MobileMapSheet({
  selectedGu, setSelectedGu, selectedApt, loading,
  showGuDropdown, setShowGuDropdown, selectedSido, setSelectedSido,
  tradeType, setTradeType, topChanges, selectAndMoveToApt, setRiskPopup,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const startY = useRef(0);
  const startExpanded = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startExpanded.current = expanded;
  }, [expanded]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = startY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) {
      setExpanded(delta > 0);
    }
  }, []);

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] flex flex-col bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out"
      style={{ height: expanded ? `${EXPANDED_HEIGHT_VH}vh` : `${PEEK_HEIGHT}px`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* 핸들 바 + 요약 */}
      <div
        className="flex-shrink-0 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-2">
            <MapPin size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            <span className="text-[13px] font-bold text-[#1d1d1f]">{selectedGu}</span>
            <span className="text-[11px] font-medium text-[#6e6e73]">· {tradeType}</span>
          </div>
          {expanded
            ? <ChevronDown size={16} className="text-[#aeaeb2]" />
            : <ChevronUp size={16} className="text-[#aeaeb2]" />
          }
        </div>
      </div>

      {/* 펼쳐진 내용 */}
      {expanded && (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 필터 */}
          <div className="flex items-center gap-2 px-4 pb-3 border-b border-black/[0.06]">
            <div className="relative flex-1">
              <button
                onClick={() => setShowGuDropdown(!showGuDropdown)}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/[0.12] bg-[#f5f5f7] px-3 py-2 text-[12.5px] font-semibold text-[#1d1d1f]"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                  {selectedGu}
                </span>
                <ChevronDown size={13} className="text-[#aeaeb2]" />
              </button>
              {showGuDropdown && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 flex rounded-[14px] border border-black/10 bg-white shadow-lg overflow-hidden" style={{ maxHeight: "260px" }}>
                  <div className="w-[100px] flex-shrink-0 border-r border-black/[0.06] overflow-y-auto">
                    <p className="sticky top-0 bg-[#f5f5f7] px-2.5 py-1.5 text-[10px] font-bold text-[#aeaeb2] uppercase tracking-wider">시도</p>
                    {Object.keys(SIDO_MAP).map((sido) => (
                      <button
                        key={sido}
                        onClick={() => setSelectedSido(sido)}
                        className="block w-full px-2.5 py-1.5 text-left text-[12px] border-none"
                        style={{ fontWeight: sido === selectedSido ? 700 : 400, color: sido === selectedSido ? "#0071e3" : "#3d3d3f", background: sido === selectedSido ? "rgba(0,113,227,0.08)" : "transparent" }}
                      >
                        {sido}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <p className="sticky top-0 bg-[#f5f5f7] px-2.5 py-1.5 text-[10px] font-bold text-[#aeaeb2] uppercase tracking-wider">시군구</p>
                    {(SIDO_MAP[selectedSido] || []).map((gu) => (
                      <button
                        key={gu}
                        onClick={() => { setSelectedGu(gu); setShowGuDropdown(false); }}
                        className="block w-full px-2.5 py-1.5 text-left text-[12px] border-none"
                        style={{ fontWeight: gu === selectedGu ? 600 : 400, color: gu === selectedGu ? "#0071e3" : "#3d3d3f", background: gu === selectedGu ? "rgba(0,113,227,0.07)" : "transparent" }}
                      >
                        {gu}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex rounded-[10px] border border-black/10 overflow-hidden flex-shrink-0">
              {(["매매", "전세"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTradeType(t)}
                  className="border-none text-[12px] font-semibold px-3.5 py-2"
                  style={{ background: tradeType === t ? "#0071e3" : "#fff", color: tradeType === t ? "#fff" : "#6e6e73" }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* TOP 변동 */}
          <div className="px-4 py-3">
            <h3 className="text-[12.5px] font-bold text-[#1d1d1f] mb-1">{selectedGu} 시세 변동 TOP</h3>
            <p className="text-[10.5px] text-[#b86f00] mb-3">국토부 실거래 신고 기준</p>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[48px] rounded-xl bg-black/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {topChanges.map((apt, i) => {
                  const isSelected = selectedApt?.name === apt.name;
                  const isUp = (apt.change ?? 0) >= 0;
                  return (
                    <button
                      key={apt.name}
                      onClick={() => { selectAndMoveToApt(apt); setExpanded(false); }}
                      className="flex items-center gap-2.5 rounded-xl p-2.5 text-left border-none"
                      style={{ background: isSelected ? "rgba(0,113,227,0.05)" : "#f5f5f7", border: isSelected ? "1.5px solid rgba(0,113,227,0.25)" : "1.5px solid transparent" }}
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white flex-shrink-0" style={{ background: RANK_COLORS[i] ?? "#aeaeb2" }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1d1d1f] m-0 truncate">{apt.name}</p>
                        <p className="text-[10px] text-[#6e6e73] m-0">{apt.area}평 · {apt.year}년</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px] font-bold text-[#1d1d1f] m-0">{formatPrice(apt.price)}</p>
                        <p className="text-[10px] font-bold m-0" style={{ color: isUp ? "#ff3b30" : "#0071e3" }}>
                          {apt.change !== null ? `${isUp ? "+" : ""}${apt.change}%` : "-"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 선택된 아파트 */}
          {selectedApt && (() => {
            const isUp = (selectedApt.change ?? 0) >= 0;
            return (
              <div className="mx-4 mb-4 rounded-2xl p-3.5" style={{ background: "#fff", border: "1px solid rgba(0,113,227,0.18)", boxShadow: "0 2px 12px rgba(0,113,227,0.08)" }}>
                <div className="flex items-start justify-between mb-2.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-[#1d1d1f] m-0 truncate">{selectedApt.name}</h4>
                    <p className="text-[11px] text-[#6e6e73] m-0 mt-0.5">{selectedApt.dong}</p>
                  </div>
                  {selectedApt.change !== null ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: isUp ? "rgba(255,59,48,0.08)" : "rgba(0,113,227,0.08)", color: isUp ? "#ff3b30" : "#0071e3" }}>
                      {isUp ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
                      {isUp ? "+" : ""}{selectedApt.change}%
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { label: "시세", value: formatPrice(selectedApt.price) },
                    { label: "면적", value: `${selectedApt.area}평` },
                    { label: "건축", value: `${selectedApt.year}년` },
                    { label: "법정동", value: selectedApt.dong },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-[10px] bg-[#f5f5f7] px-2.5 py-2">
                      <p className="text-[10px] text-[#aeaeb2] m-0">{label}</p>
                      <p className="text-[12px] font-bold text-[#1d1d1f] m-0 mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRiskPopup({ apt: selectedApt, risk: analyzeRisk(selectedApt) })}
                  className="block w-full rounded-[10px] bg-[#0071e3] py-2.5 text-center text-[12px] font-semibold text-white border-none"
                  style={{ boxShadow: "0 2px 10px rgba(0,113,227,0.30)" }}
                >
                  위험도 분석 →
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
