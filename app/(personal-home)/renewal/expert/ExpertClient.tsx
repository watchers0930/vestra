"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import s from "./expert.module.css";
import { useExpertConsult } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
import RenewalGnb from "../_shared/RenewalGnb";
import RenewalLoginModal from "../_shared/RenewalLoginModal";
import RenewalSignupModal from "../_shared/RenewalSignupModal";
import ExpertFooter from "./components/ExpertFooter";
import ExpertFields from "./components/ExpertFields";
import ExpertList from "./components/ExpertList";
import ConsultForm from "./components/ConsultForm";
import ProcessSection from "./components/ProcessSection";
import { KeepzipDraftForm } from "../keepzip/components/KeepzipDraftForm";
import type { Expert } from "@/components/expert/ExpertCard";
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

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // STEP 1 상태: 선택한 분야(영역)
  const [selectedField, setSelectedField] = useState<{ categories: string[]; label: string } | null>(null);
  // STEP 3 의도: 상담(consult) vs 내용증명(keepzip). 변호사만 두 갈래.
  const [intent, setIntent] = useState<ExpertIntent>("consult");
  // 로그인 유도 모달 (내용증명은 로그인 필요)
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // 브라우저 뒤로가기(popstate)를 스텝 단위로 연동 — 페이지 이탈 대신 한 스텝 복귀
  const selectedExpertRef = useRef(selectedExpert);
  const selectedFieldRef = useRef(selectedField);
  useEffect(() => { selectedExpertRef.current = selectedExpert; }, [selectedExpert]);
  useEffect(() => { selectedFieldRef.current = selectedField; }, [selectedField]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const currentStep = selectedExpertRef.current ? 3 : selectedFieldRef.current ? 2 : 1;
      const target = (e.state as { expertStep?: number } | null)?.expertStep ?? 1;
      // 뒤로가기(target < current)만 스텝 복귀 처리. 앞으로가기는 값 복원 불가라 무시.
      if (target < currentStep) {
        if (currentStep === 3) resetConsultForm();
        else if (currentStep === 2) setSelectedField(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [resetConsultForm]);

  // 스텝 전진 시 히스토리 항목 적재 (뒤로가기가 이 항목을 소비)
  const pushStep = (step: number) => window.history.pushState({ expertStep: step }, "");

  const handleSelectField = (categories: string[], label: string) => {
    setSelectedField({ categories, label });
    pushStep(2);
  };

  const handleSelectExpert = (expert: Expert, it: ExpertIntent) => {
    // 내용증명 작성은 로그인 필요 → 미로그인 시 로그인 유도
    if (it === "keepzip" && !isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setIntent(it);
    handleConsult(expert);
    pushStep(3);
  };

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
            <button type="button" onClick={() => window.history.back()} style={backBtnStyle}>← 전문가 목록으로</button>
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
            <button type="button" onClick={() => window.history.back()} style={backBtnStyle}>← 분야 선택으로</button>
            <ExpertList
              categories={selectedField.categories}
              fieldLabel={selectedField.label}
              onSelect={handleSelectExpert}
            />
          </>
        ) : (
          /* STEP 1 — 분야(영역) 선택 */
          <>
            <ExpertFields onSelect={handleSelectField} />
            <ProcessSection />
          </>
        )}
      </div>

      <ExpertFooter />

      {showLogin && (
        <RenewalLoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
        />
      )}
      {showSignup && (
        <RenewalSignupModal
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
        />
      )}
    </div>
  );
}
