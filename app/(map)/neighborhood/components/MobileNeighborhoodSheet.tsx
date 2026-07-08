"use client";

import { useState, useRef, useCallback } from "react";
import {
  MapPin, Train, GraduationCap, ShoppingCart, Building2,
  ChevronDown, ChevronUp, ChevronRight, Loader2, Sparkles,
  Navigation, Heart, Eye, EyeOff,
} from "lucide-react";
import type { AnalysisResult, FacilityGroup, FacilityItem } from "../hooks/useNeighborhoodData";
import AddressAutocomplete, { type AddressResult } from "@/components/common/AddressAutocomplete";

const CATEGORY_META = [
  { key: "transport"   as const, label: "교통", icon: Train,         color: "#0071e3", weight: "25%" },
  { key: "education"   as const, label: "교육", icon: GraduationCap, color: "#6e3de8", weight: "20%" },
  { key: "medical"     as const, label: "의료", icon: Heart,         color: "#ff3b30", weight: "20%" },
  { key: "convenience" as const, label: "편의", icon: ShoppingCart,  color: "#1a9e45", weight: "15%" },
  { key: "living"      as const, label: "생활", icon: Building2,     color: "#b86f00", weight: "20%" },
];

function getScoreColor(score: number) {
  if (score >= 80) return "#1a9e45";
  if (score >= 60) return "#0071e3";
  if (score >= 40) return "#b86f00";
  return "#ff3b30";
}

function getScoreBg(score: number) {
  if (score >= 80) return "rgba(48,209,88,0.10)";
  if (score >= 60) return "rgba(0,113,227,0.10)";
  if (score >= 40) return "rgba(255,159,10,0.10)";
  return "rgba(255,59,48,0.10)";
}

function formatDistance(m: number) {
  if (m === 0) return "-";
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

const PEEK_HEIGHT = 120;
const EXPANDED_HEIGHT_VH = 55;

interface Props {
  address: string;
  setAddress: (v: string) => void;
  loading: boolean;
  result: AnalysisResult | null;
  error: string;
  expandedCats: Set<string>;
  visibleFacilities: Set<string>;
  toggleCat: (key: string) => void;
  handleAnalyze: (overrideAddress?: string) => void;
  toggleFacility: (key: string) => void;
  toggleAllFacilities: (show: boolean) => void;
  navigateTo: (lat: number, lng: number) => void;
  highlightItem: (item: FacilityItem, color: string) => void;
}

export function MobileNeighborhoodSheet({
  address, setAddress, loading, result, error,
  expandedCats, visibleFacilities,
  toggleCat, handleAnalyze, toggleFacility, toggleAllFacilities, navigateTo, highlightItem,
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
      {/* 핸들 바 */}
      <div
        className="flex-shrink-0 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>
        <div className="flex items-center justify-between px-4 pb-1.5">
          <div className="flex items-center gap-2">
            <MapPin size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            <span className="text-[13px] font-bold text-[#1d1d1f]">주변환경 분석</span>
            {result && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: getScoreColor(result.totalScore), background: getScoreBg(result.totalScore) }}>
                {result.totalScore}점
              </span>
            )}
          </div>
          {expanded
            ? <ChevronDown size={16} className="text-[#aeaeb2]" />
            : <ChevronUp size={16} className="text-[#aeaeb2]" />
          }
        </div>
      </div>

      {/* 검색바 — 항상 표시 */}
      <div className="flex-shrink-0 flex gap-2 px-4 pb-2.5" onClick={(e) => e.stopPropagation()}>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={(r: AddressResult) => {
            handleAnalyze(r.roadAddress || r.address);
            setExpanded(true);
          }}
          onSubmit={(addr?: string) => {
            handleAnalyze(addr);
            setExpanded(true);
          }}
        />
        <button
          onClick={() => { handleAnalyze(); setExpanded(true); }}
          disabled={loading || !address.trim()}
          className="flex-shrink-0 flex items-center rounded-[10px] border-none px-4 py-[9px] text-[12.5px] font-semibold text-white transition-all duration-150"
          style={{
            background: loading || !address.trim() ? "rgba(0,113,227,0.35)" : "#0071e3",
            cursor: loading || !address.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "분석"}
        </button>
      </div>
      {error && <p className="px-4 text-[11px] text-[#ff3b30]">{error}</p>}

      {/* 펼쳐진 내용 */}
      {expanded && (
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* 로딩 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5">
              <Loader2 size={22} className="animate-spin text-[#0071e3]" />
              <p className="text-[12px] text-[#6e6e73]">주변 환경 분석 중...</p>
            </div>
          )}

          {/* 분석 결과 */}
          {result && !loading && (
            <div className="px-4 py-3">
              {/* 종합 점수 */}
              <div className="bg-[#f5f5f7] rounded-2xl p-3.5 mb-2.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `conic-gradient(${getScoreColor(result.totalScore)} ${result.totalScore * 3.6}deg, #e5e7eb 0deg)` }}>
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[15px] font-bold" style={{ color: getScoreColor(result.totalScore) }}>{result.totalScore}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#1d1d1f]">{result.totalGrade} 등급</span>
                    </div>
                    <p className="text-[11px] text-[#6e6e73] m-0 truncate">{result.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_META.map((c) => {
                    const cat = result.categories[c.key];
                    return (
                      <span key={c.key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold" style={{ background: `${c.color}14`, color: c.color }}>
                        <c.icon size={9} strokeWidth={1.5} />
                        {c.label} {cat.score}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* K-apt 단지정보 */}
              {result.kaptInfo && (
                <div className="px-3 py-2.5 rounded-xl bg-[rgba(110,62,232,0.05)] border border-[rgba(110,62,232,0.12)] mb-2.5">
                  <div className="flex items-center gap-[5px] mb-1.5">
                    <Building2 size={12} strokeWidth={1.5} className="text-[#6e3de8] flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-[#6e3de8]">단지정보</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pl-[17px]">
                    {[
                      result.kaptInfo.households && `${result.kaptInfo.households}세대`,
                      result.kaptInfo.constructorName && `시공 ${result.kaptInfo.constructorName}`,
                      result.kaptInfo.cctvCount && `CCTV ${result.kaptInfo.cctvCount}대`,
                      result.kaptInfo.parkingTotal && `주차 ${result.kaptInfo.parkingTotal}대`,
                      result.kaptInfo.elevatorCount && `승강기 ${result.kaptInfo.elevatorCount}대`,
                    ].filter(Boolean).map((text, i) => (
                      <span key={i} className="text-[10.5px] text-[#3d3d3f]">
                        {i > 0 && <span className="text-[#d1d1d6] mx-0.5">·</span>}
                        {text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 코멘트 */}
              {result.aiComment && (
                <div className="flex gap-2.5 px-3 py-2.5 rounded-[14px] bg-[rgba(0,113,227,0.05)] border border-[rgba(0,113,227,0.12)] mb-2.5">
                  <Sparkles size={13} strokeWidth={1.5} className="text-[#0071e3] flex-shrink-0 mt-px" />
                  <p className="text-[11.5px] text-[#3d3d3f] leading-[1.7] m-0">{result.aiComment}</p>
                </div>
              )}

              {/* 시설 표시 토글 */}
              {result.facilities && (
                <div className="bg-[#f5f5f7] rounded-[14px] p-3 mb-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-[#aeaeb2] tracking-[0.06em] uppercase m-0">시설 표시</p>
                    <div className="flex gap-2">
                      <button onClick={() => toggleAllFacilities(true)} className="text-[10px] text-[#0071e3] bg-transparent border-none cursor-pointer font-medium p-0">전체 보기</button>
                      <span className="text-[#d1d1d6]">|</span>
                      <button onClick={() => toggleAllFacilities(false)} className="text-[10px] text-[#aeaeb2] bg-transparent border-none cursor-pointer font-medium p-0">전체 숨기기</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(result.facilities).map(([key, fac]) => {
                      const f = fac as FacilityGroup;
                      const visible = visibleFacilities.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleFacility(key)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-all duration-150"
                          style={{ border: `1px solid ${f.color}`, background: visible ? `${f.color}14` : "transparent", color: f.color, opacity: visible ? 1 : 0.4 }}
                        >
                          {visible ? <Eye size={9} strokeWidth={1.5} /> : <EyeOff size={9} strokeWidth={1.5} />}
                          {f.label} ({f.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 카테고리 아코디언 */}
              <div className="flex flex-col gap-1.5">
                {CATEGORY_META.map((c) => {
                  const cat = result.categories[c.key];
                  const Icon = c.icon;
                  const isExpanded = expandedCats.has(c.key);
                  return (
                    <div key={c.key} className="bg-[#f5f5f7] rounded-[14px] overflow-hidden">
                      <button
                        onClick={() => toggleCat(c.key)}
                        className="w-full px-3 py-2.5 flex items-center gap-2 bg-transparent border-none cursor-pointer text-left"
                      >
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${c.color}14` }}>
                          <Icon size={13} strokeWidth={1.5} style={{ color: c.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-bold text-[#1d1d1f]">{c.label}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 rounded-full bg-black/[0.06] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: getScoreColor(cat.score) }} />
                            </div>
                            <span className="text-[11px] font-bold min-w-5 text-right" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${c.color}14`, color: c.color }}>
                          {cat.grade}
                        </span>
                        <ChevronRight size={12} strokeWidth={1.5} className={`text-[#aeaeb2] flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>

                      {isExpanded && result.facilities && (
                        <div className="px-3 pb-2.5 border-t border-black/[0.06]">
                          <div className="flex items-center gap-3 py-2 text-[10.5px] text-[#6e6e73]">
                            <span>시설 <strong className="text-[#1d1d1f]">{cat.count}개</strong></span>
                            <span>최근접 <strong className="text-[#1d1d1f]">{formatDistance(cat.nearest)}</strong></span>
                          </div>
                          {Object.entries(result.facilities)
                            .filter(([, fac]) => (fac as FacilityGroup).category === c.key)
                            .map(([key, fac]) => {
                              const f = fac as FacilityGroup;
                              return (
                                <div key={key} className="mb-2">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: f.color }} />
                                    <span className="text-[10.5px] font-bold" style={{ color: f.color }}>{f.label}</span>
                                    <span className="text-[10px] text-[#aeaeb2]">({f.count})</span>
                                  </div>
                                  {f.items.length === 0 ? (
                                    <p className="text-[10px] text-[#aeaeb2] pl-3">없음</p>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      {f.items.slice(0, 5).map((item, i) => (
                                        <button
                                          key={i}
                                          onClick={() => highlightItem(item, f.color)}
                                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg bg-transparent border-none cursor-pointer text-left active:bg-black/5"
                                        >
                                          <Navigation size={9} strokeWidth={1.5} className="flex-shrink-0" style={{ color: f.color }} />
                                          <span className="text-[11px] text-[#1d1d1f] flex-1 truncate">{item.name}</span>
                                          <span className="text-[10px] text-[#aeaeb2] tabular-nums flex-shrink-0">{formatDistance(item.distance)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {Object.entries(result.facilities).filter(([, fac]) => (fac as FacilityGroup).category === c.key).length === 0 && (
                            <p className="text-[10.5px] text-[#aeaeb2] py-1">반경 1km 내 시설 없음</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <MapPin size={20} strokeWidth={1.5} className="text-[#0071e3] mb-2" />
              <p className="text-[12.5px] font-semibold text-[#1d1d1f] mb-1">주소를 입력해 주세요</p>
              <p className="text-[11px] text-[#aeaeb2] leading-[1.6]">주변 환경을 AI가 분석합니다</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
