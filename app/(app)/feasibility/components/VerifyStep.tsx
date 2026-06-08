"use client";

import { useEffect, useState } from "react";
import { FileText, Database, Calculator, Brain, FileCheck, Check } from "lucide-react";

const STAGES = [
  { icon: FileText, label: "문서 데이터 정리 중", desc: "업로드된 문서에서 핵심 데이터를 추출합니다", delayMs: 3000 },
  { icon: Database, label: "공공 데이터 수집 중", desc: "국토부·통계청·금감원 등 외부 데이터를 수집합니다", delayMs: 9000 },
  { icon: Calculator, label: "수익성 계산 엔진 실행", desc: "BEP·DSCR·민감도 분석 등 7개 계산 엔진을 실행합니다", delayMs: 10000 },
  { icon: Brain, label: "AI 검토 의견 생성 중", desc: "GPT-4o가 장별 검토 의견과 종합 판정을 작성합니다", delayMs: 18000 },
  { icon: FileCheck, label: "보고서 조립 중", desc: "분석 결과를 SCR 보고서 형식으로 조립합니다", delayMs: 0 },
];

export function VerifyStep() {
  const [activeStage, setActiveStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // 단계 자동 진행
  useEffect(() => {
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i < STAGES.length; i++) {
      cumulative += STAGES[i - 1].delayMs;
      const stageIndex = i;
      timers.push(setTimeout(() => setActiveStage(stageIndex), cumulative));
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  // 경과 시간 카운터
  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "32px 24px" }}>
      {/* 상단 헤더 */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ position: "relative", width: "48px", height: "48px", margin: "0 auto 16px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(148deg, #0071e3, #0058b0)", opacity: 0.12 }} />
          <div style={{ position: "absolute", inset: "4px", borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#0071e3", animation: "verify-spin 0.9s linear infinite" }} />
        </div>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>사업성 검증 분석 중</p>
        <p style={{ fontSize: "12px", color: "#86868b", margin: 0 }}>경과 시간: {elapsed}초</p>
      </div>

      {/* 진행 단계 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isCompleted = i < activeStage;
          const isActive = i === activeStage;

          return (
            <div
              key={stage.label}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "12px 16px", borderRadius: "14px",
                background: isActive ? "rgba(0,113,227,0.04)" : "transparent",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: isCompleted ? "#30d158" : isActive ? "#0071e3" : "#f5f5f7",
                  transition: "all 0.3s ease",
                }}
              >
                {isCompleted
                  ? <Check size={16} color="#fff" strokeWidth={2.5} />
                  : <Icon size={16} color={isActive ? "#fff" : "#aeaeb2"} strokeWidth={1.5} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "13px", fontWeight: isActive ? 600 : 500, margin: "0 0 2px",
                  color: isCompleted ? "#30d158" : isActive ? "#1d1d1f" : "#aeaeb2",
                  transition: "color 0.3s ease",
                }}>
                  {isCompleted ? stage.label.replace(" 중", " 완료").replace(" 실행", " 완료") : stage.label}
                </p>
                {isActive && (
                  <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0, lineHeight: 1.5 }}>{stage.desc}</p>
                )}
              </div>
              {isActive && (
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#0071e3", animation: `verify-bounce 1.2s ease-in-out infinite ${d * 180}ms` }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes verify-spin { to { transform: rotate(360deg); } }
        @keyframes verify-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-4px);opacity:1} }
      `}</style>
    </div>
  );
}
