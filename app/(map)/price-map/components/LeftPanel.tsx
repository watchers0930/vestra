"use client";

import { MapPin, TrendingUp, TrendingDown, ChevronDown, BarChart3, Building2 } from "lucide-react";
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

export function LeftPanel({
  selectedGu, setSelectedGu, selectedApt, loading,
  showGuDropdown, setShowGuDropdown, selectedSido, setSelectedSido,
  tradeType, setTradeType, topChanges, selectAndMoveToApt, setRiskPopup,
}: Props) {
  return (
    <div className="hidden lg:flex" style={{ height: "100%", width: "300px", flexShrink: 0, flexDirection: "column", background: "#f5f5f7", borderRight: "1px solid rgba(0,0,0,0.08)" }}>

      {/* ── 다크 헤더 ── */}
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", flexShrink: 0 }}>
        <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-20px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "22px 18px 18px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "10px" }}>
            <BarChart3 size={9} strokeWidth={2} /> 시세지도
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.2 }}>아파트 시세 지도</h2>
          <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.40)", marginTop: "5px", marginBottom: 0, lineHeight: 1.5 }}>
            국토부 실거래 기준 · 최근 1년 변동률
          </p>
          <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
            {[
              { icon: MapPin,     label: "지역 선택" },
              { icon: TrendingUp, label: "변동 TOP" },
              { icon: Building2,  label: "위험도 분석" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <Icon size={10} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.55)" }} />
                <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.70)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 필터 영역 ── */}
      <div style={{ padding: "12px 12px 10px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* 지역 선택 드롭다운 */}
          <div style={{ position: "relative", flex: 1 }}>
            <button
              onClick={() => setShowGuDropdown(!showGuDropdown)}
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.12)", background: "#f5f5f7", padding: "8px 12px", fontSize: "12.5px", fontWeight: 600, color: "#1d1d1f", cursor: "pointer" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={13} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                {selectedGu}
              </span>
              <ChevronDown size={13} strokeWidth={1.5} style={{ color: "#aeaeb2" }} />
            </button>
            {showGuDropdown && (
              <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, width: "360px", display: "flex", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.10)", background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", overflow: "hidden" }}>
                <div style={{ width: "110px", flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.06)", overflowY: "auto", maxHeight: "260px" }}>
                  <p style={{ position: "sticky", top: 0, background: "#f5f5f7", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>시도</p>
                  {Object.keys(SIDO_MAP).map((sido) => (
                    <button
                      key={sido}
                      onClick={() => setSelectedSido(sido)}
                      style={{ display: "block", width: "100%", padding: "7px 10px", textAlign: "left" as const, fontSize: "12px", fontWeight: sido === selectedSido ? 700 : 400, color: sido === selectedSido ? "#0071e3" : "#3d3d3f", background: sido === selectedSido ? "rgba(0,113,227,0.08)" : "transparent", border: "none", cursor: "pointer" }}
                    >
                      {sido}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: "auto", maxHeight: "260px" }}>
                  <p style={{ position: "sticky", top: 0, background: "#f5f5f7", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>시군구</p>
                  {(SIDO_MAP[selectedSido] || []).map((gu) => (
                    <button
                      key={gu}
                      onClick={() => { setSelectedGu(gu); setShowGuDropdown(false); }}
                      style={{ display: "block", width: "100%", padding: "7px 10px", textAlign: "left" as const, fontSize: "12px", fontWeight: gu === selectedGu ? 600 : 400, color: gu === selectedGu ? "#0071e3" : "#3d3d3f", background: gu === selectedGu ? "rgba(0,113,227,0.07)" : "transparent", border: "none", cursor: "pointer" }}
                    >
                      {gu}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 매매/전세 토글 */}
          <div style={{ display: "flex", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.10)", overflow: "hidden", flexShrink: 0 }}>
            {(["매매", "전세"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTradeType(t)}
                style={{ padding: "8px 14px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: tradeType === t ? "#0071e3" : "#fff", color: tradeType === t ? "#fff" : "#6e6e73" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 스크롤 컨텐츠 ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

        {/* 시세 변동 TOP */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "14px", marginBottom: "10px" }}>
          <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#1d1d1f", marginBottom: "4px" }}>
            {selectedGu} 시세 변동 TOP
          </h3>
          <p style={{ fontSize: "10.5px", color: "#b86f00", lineHeight: 1.55, marginBottom: "12px" }}>
            국토부 실거래 신고 기준 · 최근 1~2개월 지연 반영
          </p>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: "52px", borderRadius: "12px", background: "rgba(0,0,0,0.05)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {topChanges.map((apt, i) => {
                const isSelected = selectedApt?.name === apt.name;
                const isUp = (apt.change ?? 0) >= 0;
                return (
                  <button
                    key={apt.name}
                    onClick={() => selectAndMoveToApt(apt)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", borderRadius: "12px", padding: "10px 12px", background: isSelected ? "rgba(0,113,227,0.05)" : "#f5f5f7", border: isSelected ? "1.5px solid rgba(0,113,227,0.25)" : "1.5px solid transparent", cursor: "pointer", textAlign: "left" as const, transition: "all 0.15s" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#ebebed"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7"; }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: RANK_COLORS[i] ?? "#aeaeb2", fontSize: "10px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d1d1f", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{apt.name}</p>
                      <p style={{ fontSize: "10.5px", color: "#6e6e73", margin: 0 }}>{apt.area}평 · {apt.year}년</p>
                    </div>
                    <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{formatPrice(apt.price)}</p>
                      <p style={{ fontSize: "10.5px", fontWeight: 700, color: isUp ? "#ff3b30" : "#0071e3", margin: 0 }}>
                        {apt.change !== null ? `${isUp ? "+" : ""}${apt.change}%` : "-"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 아파트 상세 */}
        {selectedApt && (() => {
          const isUp = (selectedApt.change ?? 0) >= 0;
          return (
            <div style={{ background: "#fff", border: "1px solid rgba(0,113,227,0.18)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,113,227,0.08)", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", gap: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#1d1d1f", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{selectedApt.name}</h4>
                  <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0, marginTop: "2px" }}>{selectedApt.dong}</p>
                </div>
                {selectedApt.change !== null ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: isUp ? "rgba(255,59,48,0.08)" : "rgba(0,113,227,0.08)", color: isUp ? "#ff3b30" : "#0071e3", flexShrink: 0 }}>
                    {isUp ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
                    {isUp ? "+" : ""}{selectedApt.change}%
                  </span>
                ) : (
                  <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "rgba(0,0,0,0.05)", color: "#aeaeb2" }}>데이터 부족</span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px" }}>
                {[
                  { label: "시세", value: formatPrice(selectedApt.price) },
                  { label: "면적", value: `${selectedApt.area}평` },
                  { label: "건축", value: `${selectedApt.year}년` },
                  { label: "법정동", value: selectedApt.dong },
                ].map(({ label, value }) => (
                  <div key={label} style={{ borderRadius: "10px", background: "#f5f5f7", padding: "8px 10px" }}>
                    <p style={{ fontSize: "10px", color: "#aeaeb2", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d1d1f", margin: 0, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRiskPopup({ apt: selectedApt, risk: analyzeRisk(selectedApt) })}
                style={{ display: "block", width: "100%", borderRadius: "10px", background: "#0071e3", padding: "9px", textAlign: "center" as const, fontSize: "12px", fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,113,227,0.30)", transition: "all 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0077ed"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0071e3"; }}
              >
                위험도 분석 →
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
