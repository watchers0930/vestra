"use client";

import { X } from "lucide-react";
import { analyzeRisk } from "../lib/analyzeRisk";
import type { AptData } from "../types";

interface Props {
  popup: { apt: AptData; risk: ReturnType<typeof analyzeRisk> };
  selectedGu: string;
  onClose: () => void;
}

const LEVEL_META: Record<string, { color: string; bg: string }> = {
  안전: { color: "#1a9e45", bg: "rgba(48,209,88,0.10)" },
  주의: { color: "#b86f00", bg: "rgba(255,159,10,0.10)" },
  위험: { color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
};

export function RiskPopup({ popup, selectedGu, onClose }: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "440px", maxHeight: "90vh", overflowY: "auto", borderRadius: "24px", background: "#fff", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", border: "1px solid rgba(0,0,0,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 다크 헤더 */}
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", borderRadius: "24px 24px 0 0", padding: "24px 24px 20px" }}>
          <div style={{ pointerEvents: "none", position: "absolute", top: "-40px", right: "-10px", width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, ${popup.risk.color}22 0%, transparent 65%)` }} />
          <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "8px" }}>
                위험도 분석
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{popup.apt.name}</h3>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "5px", margin: 0 }}>{popup.apt.dong} · {popup.apt.area}평 · {popup.apt.year}년</p>
            </div>
            <button
              onClick={onClose}
              style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <X size={14} strokeWidth={2} style={{ color: "rgba(255,255,255,0.70)" }} />
            </button>
          </div>
        </div>

        {/* 종합 점수 */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={popup.risk.color} strokeWidth="3"
                strokeDasharray={`${popup.risk.score} ${100 - popup.risk.score}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: popup.risk.color, lineHeight: 1 }}>{popup.risk.score}</span>
              <span style={{ fontSize: "9px", color: "#aeaeb2", marginTop: "2px" }}>/ 100</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6e6e73", margin: 0 }}>종합 안전 점수</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: popup.risk.color, margin: "4px 0 0" }}>{popup.risk.grade}</p>
            <p style={{ fontSize: "11px", color: "#aeaeb2", margin: "3px 0 0" }}>공공데이터 기반 자동 분석</p>
          </div>
        </div>

        {/* 항목별 분석 */}
        <div style={{ padding: "16px 24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "12px" }}>항목별 분석</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {popup.risk.items.map((item) => {
              const meta = LEVEL_META[item.level] ?? { color: "#aeaeb2", bg: "rgba(0,0,0,0.05)" };
              return (
                <div key={item.label} style={{ borderRadius: "14px", border: "1px solid rgba(0,0,0,0.07)", padding: "12px 14px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1d1d1f" }}>{item.label}</span>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", color: meta.color, background: meta.bg }}>
                      {item.level}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{item.value}</p>
                  <p style={{ fontSize: "11.5px", color: "#6e6e73", margin: "3px 0 0", lineHeight: 1.55 }}>{item.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 안내 + 링크 */}
        <div style={{ padding: "0 24px 20px" }}>
          <p style={{ fontSize: "10.5px", color: "#aeaeb2", textAlign: "center" as const, lineHeight: 1.65, marginBottom: "12px" }}>
            ※ 본 분석은 공공데이터 기반 자동 산출 결과이며, 투자 판단의 근거로 사용할 수 없습니다.<br />
            정확한 분석을 위해 등기부등본 확인을 권장합니다.
          </p>
          <a
            href={`/rights?address=${encodeURIComponent(`서울특별시 ${selectedGu} ${popup.apt.dong} ${popup.apt.name}`)}`}
            style={{ display: "block", width: "100%", borderRadius: "12px", border: "1px solid rgba(0,113,227,0.20)", background: "rgba(0,113,227,0.05)", padding: "10px", textAlign: "center" as const, fontSize: "12.5px", fontWeight: 600, color: "#0071e3", textDecoration: "none", transition: "all 0.15s", boxSizing: "border-box" as const }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,113,227,0.10)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,113,227,0.05)"; }}
          >
            등기부등본으로 정밀 분석하기 →
          </a>
        </div>
      </div>
    </div>
  );
}
