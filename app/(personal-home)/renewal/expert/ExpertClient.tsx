"use client";

import { useState } from "react";
import s from "./expert.module.css";
import { useExpertConsult } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertFooter from "./components/ExpertFooter";
import ExpertFields from "./components/ExpertFields";
import ExpertList from "./components/ExpertList";
import ConsultForm from "./components/ConsultForm";
import ProcessSection from "./components/ProcessSection";
import { KeepzipDraftForm } from "../keepzip/components/KeepzipDraftForm";
import type { ExpertIntent } from "./components/ExpertList";

const backBtnStyle: React.CSSProperties = {
  background: "none", border: "none", color: "#2e4bd8", fontSize: "13.5px",
  fontWeight: 600, cursor: "pointer", padding: "0 0 16px", alignSelf: "flex-start",
};

export default function ExpertClient() {
  const {
    selectedExpert,
    formState, setFormState,
    submitting, submitted, error,
    handleConsult, handleSubmit, resetConsultForm,
  } = useExpertConsult();

  // STEP 1 상태: 선택한 분야(영역)
  const [selectedField, setSelectedField] = useState<{ categories: string[]; label: string } | null>(null);
  // STEP 3 의도: 상담(consult) vs 내용증명(keepzip). 변호사만 두 갈래.
  const [intent, setIntent] = useState<ExpertIntent>("consult");

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
        {selectedExpert ? (
          /* STEP 3 — 상담폼(일반) 또는 내용증명 작성(변호사) */
          <>
            <button type="button" onClick={resetConsultForm} style={backBtnStyle}>← 전문가 목록으로</button>
            {selectedExpert.category === "변호사" && intent === "keepzip" ? (
              <KeepzipDraftForm lawyerName={selectedExpert.name} />
            ) : (
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
            )}
          </>
        ) : selectedField ? (
          /* STEP 2 — 선택한 분야의 전문가 목록 */
          <>
            <button type="button" onClick={() => setSelectedField(null)} style={backBtnStyle}>← 분야 선택으로</button>
            <ExpertList
              categories={selectedField.categories}
              fieldLabel={selectedField.label}
              onSelect={(expert, it) => { setIntent(it); handleConsult(expert); }}
            />
          </>
        ) : (
          /* STEP 1 — 분야(영역) 선택 */
          <>
            <ExpertFields onSelect={(categories, label) => setSelectedField({ categories, label })} />
            <ProcessSection />
          </>
        )}
      </div>

      <ExpertFooter />
    </div>
  );
}
