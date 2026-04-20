"use client";

import { Brain, UserCheck, FileCheck, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Brain, label: "1단계: AI 즉시 분석",
    desc: "문서 업로드 즉시 AI가\n권리관계·위험요소를 분석",
    badge: "평균 3.2초 소요", badgeColor: "#0071e3", badgeBg: "rgba(0,113,227,0.10)",
    iconColor: "#2997ff", iconBg: "rgba(0,113,227,0.15)",
  },
  {
    icon: UserCheck, label: "2단계: 전문가 정밀 검증",
    desc: "공인중개사·법무사가\nAI 분석 결과를 교차 검증",
    badge: "24시간 내 완료", badgeColor: "#10b981", badgeBg: "rgba(16,185,129,0.10)",
    iconColor: "#10b981", iconBg: "rgba(16,185,129,0.15)",
  },
  {
    icon: FileCheck, label: "최종: 검증 완료 보고서",
    desc: "AI 분석 + 전문가 의견이\n통합된 최종 보고서 제공",
    badge: "신뢰도 99%+", badgeColor: "#7c3aed", badgeBg: "rgba(124,58,237,0.10)",
    iconColor: "#7c3aed", iconBg: "rgba(124,58,237,0.15)",
  },
];

export function ProcessInfographic() {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", marginTop: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>AI + 전문가 하이브리드 검증 프로세스</h2>
      <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 24px" }}>AI가 빠르게 1차 분석하고, 전문가가 정밀 검증하는 2단계 프로세스</p>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="process-flow">
        {STEPS.map((s, i) => (
          <>
            <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "20px 16px", borderRadius: "14px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: s.iconBg, border: `1px solid ${s.iconColor}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <s.icon size={24} strokeWidth={1.5} style={{ color: s.iconColor }} />
              </div>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>{s.label}</h3>
              <p style={{ fontSize: "11px", color: "#6e6e73", lineHeight: 1.6, margin: "0 0 10px", whiteSpace: "pre-line" }}>{s.desc}</p>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, color: s.badgeColor, background: s.badgeBg }}>{s.badge}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight key={`arrow-${i}`} size={18} strokeWidth={1.5} style={{ color: "#aeaeb2", flexShrink: 0 }} className="process-arrow" />
            )}
          </>
        ))}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .process-flow { flex-direction: column !important; }
          .process-arrow { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
