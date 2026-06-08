"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardPageHero, DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { ExpertCard } from "@/components/expert/ExpertCard";
import { BadgeCheck, CalendarCheck, ShieldCheck, Users } from "lucide-react";
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
    <AuthGuard featureName="전문가 연결">
    <div>
      <DashboardPageTopbar current="전문가 연결" primaryHref="/assistant" primaryLabel="AI 상담" />
      <div className="px-4 pb-20 sm:px-6 lg:px-9">
        <div className="mb-7 mt-[18px]">
          <DashboardPageHero
            eyebrow="전문가 연결"
            title="AI 분석 결과를 전문가가 검증합니다"
            description="법무, 세무, 중개, 감정 분야 전문가에게 분석 결과 기반 상담을 요청할 수 있습니다."
            icon={Users}
            statItems={[
              { icon: BadgeCheck, label: "검증 전문가", value: `${EXPERTS.length}명`, valueColor: "#2997ff" },
              { icon: ShieldCheck, label: "AI 결과", value: "검증" },
              { icon: CalendarCheck, label: "상담 예약", value: "가능" },
            ]}
          />
        </div>

      {/* ── 전문가 목록 ── */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>전문가 목록</h2>
        <p style={{ fontSize: "13px", color: "#6e6e73", margin: "0 0 16px" }}>분야별 검증된 전문가를 선택하고 상담을 요청하세요</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {EXPERTS.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} onConsult={handleConsult} />
          ))}
        </div>
      </div>

      <PricingSection />

      {/* ── 상담예약 + 상담요청 2칼럼 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <ReservationForm reservationForm={reservationForm} setReservationForm={setReservationForm} onSubmit={handleReservationSubmit} />
        <ConsultForm selectedExpert={selectedExpert} formState={formState} setFormState={setFormState} submitting={submitting} submitted={submitted} error={error} onSubmit={handleSubmit} onReset={resetConsultForm} />
      </div>

      <ProcessInfographic />
      </div>
    </div>
    </AuthGuard>
  );
}
