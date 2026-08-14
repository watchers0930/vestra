"use client";

import s from "./expert.module.css";
import { useExpertConsult } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertFooter from "./components/ExpertFooter";
import ExpertFields from "./components/ExpertFields";
import ExpertList from "./components/ExpertList";
import ConsultForm from "./components/ConsultForm";
import ProcessSection from "./components/ProcessSection";

export default function ExpertClient() {
  const {
    selectedExpert,
    formState, setFormState,
    submitting, submitted, error,
    handleConsult, handleSubmit, resetConsultForm,
  } = useExpertConsult();

  return (
    <div className={s.page}>
      <RenewalGnb active="expert" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Expert Connect</span>
          <h1>전문가 연결</h1>
          <p className={s.subHeroSub}>부동산 전문가와 1:1 상담을 연결해 드립니다</p>
        </div>
      </section>

      <div className={s.panelWrap}>
        <ExpertFields />
        <ExpertList onConsult={handleConsult} />
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
        <ProcessSection />
      </div>

      <ExpertFooter />
    </div>
  );
}
