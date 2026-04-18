"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
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
    <div>
      <PageHeader
        icon={Users}
        title="전문가 상담"
        description="AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다"
      />

      {/* 전문가 목록 */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">전문가 목록</h2>
        <p className="text-sm text-[#6e6e73] mb-5">분야별 검증된 전문가를 선택하고 상담을 요청하세요</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERTS.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} onConsult={handleConsult} />
          ))}
        </div>
      </div>

      <PricingSection />

      <ReservationForm
        reservationForm={reservationForm}
        setReservationForm={setReservationForm}
        onSubmit={handleReservationSubmit}
      />

      <ConsultForm
        selectedExpert={selectedExpert}
        formState={formState}
        setFormState={setFormState}
        submitting={submitting}
        submitted={submitted}
        error={error}
        onSubmit={handleSubmit}
        onReset={resetConsultForm}
      />

      <ProcessInfographic />
    </div>
  );
}
