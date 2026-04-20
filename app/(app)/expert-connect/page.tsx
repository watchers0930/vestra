"use client";

import { Users, Sparkles } from "lucide-react";
import { ExpertCard } from "@/components/expert/ExpertCard";
import { useExpertConsult } from "./hooks/useExpertConsult";
import { PricingSection } from "./components/PricingSection";
import { ReservationForm } from "./components/ReservationForm";
import { ConsultForm } from "./components/ConsultForm";
import { ProcessInfographic } from "./components/ProcessInfographic";
import { EXPERTS } from "./constants";

export default function ExpertConnectPage() {
  const {
    selectedExpert,
    formState, setFormState,
    submitting, submitted, error,
    reservationForm, setReservationForm,
    handleReservationSubmit, handleConsult, handleSubmit, resetConsultForm,
  } = useExpertConsult();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── 히어로 배너 ── */}
      <section style={{ position: "relative", overflow: "hidden", borderRadius: "24px", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", marginTop: "10px", marginBottom: "24px" }}>
        <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-20px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.20) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", bottom: "-40px", left: "30%", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(41,151,255,0.10) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", padding: "22px 28px", gap: "16px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(0,113,227,0.20)", border: "1px solid rgba(0,113,227,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={20} strokeWidth={1.5} style={{ color: "#2997ff" }} />
          </div>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "5px" }}>
              <Sparkles size={8} strokeWidth={2} /> 전문가 연결
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>전문가 상담</h2>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "3px 0 0", lineHeight: 1.4 }}>AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다</p>
          </div>
        </div>
      </section>

      {/* ── 전문가 목록 ── */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>전문가 목록</h2>
        <p style={{ fontSize: "13px", color: "#6e6e73", margin: "0 0 16px" }}>분야별 검증된 전문가를 선택하고 상담을 요청하세요</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }} className="expert-grid">
          {EXPERTS.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} onConsult={handleConsult} />
          ))}
        </div>
      </div>

      <PricingSection />

      {/* ── 상담예약 + 상담요청 2칼럼 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }} className="form-grid">
        <ReservationForm reservationForm={reservationForm} setReservationForm={setReservationForm} onSubmit={handleReservationSubmit} />
        <ConsultForm selectedExpert={selectedExpert} formState={formState} setFormState={setFormState} submitting={submitting} submitted={submitted} error={error} onSubmit={handleSubmit} onReset={resetConsultForm} />
      </div>

      <ProcessInfographic />

      <style>{`
        @media (max-width: 900px) { .expert-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .expert-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
