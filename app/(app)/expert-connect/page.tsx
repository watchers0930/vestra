"use client";

import { CategoryHero } from "@/components/common/CategoryHero";
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
      <CategoryHero
        badge="✨ 전문가 연결"
        title="전문가 상담"
        description="AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다"
        marginBottom="24px"
      />

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
