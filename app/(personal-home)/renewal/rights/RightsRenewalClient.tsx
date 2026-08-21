"use client";

import { useState, useRef, useEffect } from "react";
import s from "./rights-renewal.module.css";
import { useRightsAnalysis } from "@/app/(app)/rights/hooks/useRightsAnalysis";
import RenewalGnb from "../_shared/RenewalGnb";
import RightsRenewalFooter from "./components/RightsRenewalFooter";
import RightsAnalysisForm from "./components/RightsAnalysisForm";
import RightsResultPanel from "./components/RightsResultPanel";
import RightsMarketingSections from "./components/RightsMarketingSections";
import RightsSecondaryTabs from "./components/RightsSecondaryTabs";

type TabId = "analysis" | "owner" | "history" | "guide";

const TABS: { id: TabId; label: string; gated?: boolean }[] = [
  { id: "analysis", label: "권리관계 분석" },
  { id: "owner", label: "소유자 · 매도인 확인", gated: true },
  { id: "history", label: "등기이력 조회", gated: true },
  { id: "guide", label: "이용 안내", gated: true },
];

export default function RightsRenewalClient({ initialAddress = "" }: { initialAddress?: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");
  const snavRef = useRef<HTMLDivElement>(null);

  const {
    step, result, error,
    fileName, isExtracting, rawText,
    estimatedPrice, setEstimatedPrice,
    tilkoAddress, setTilkoAddress, tilkoFetching, setTilkoSource,
    setInputMode, fileInputRef,
    handleFileChange, handleAddressAnalyze, handleAnalyze,
    ownerMatch, registryOwnerMasked,
  } = useRightsAnalysis();

  // 메인 랜딩에서 넘어온 주소(?address=)를 주소 입력창에 프리필
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialAddress) setTilkoAddress(initialAddress);
  }, [initialAddress, setTilkoAddress]);

  // 권리관계 분석 결과가 나온 뒤에만 보조 탭(소유자·등기이력·이용안내) 노출
  const hasResult = !!result && step === "done";
  // 결과가 없으면 보조 탭에 머물지 않고 분석 탭으로 복귀
  const effectiveTab: TabId = !hasResult && activeTab !== "analysis" ? "analysis" : activeTab;

  const scrollToNav = () => {
    if (snavRef.current) {
      window.scrollTo({ top: snavRef.current.offsetTop - 80, behavior: "smooth" });
    }
  };

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    scrollToNav();
  };

  return (
    <>
      <RenewalGnb active="rights" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>AI Rights Analysis</span>
          <h1>권리분석</h1>
          <p className={s.subHeroSub}>갑구·을구 권리관계를 AI가 종합 분석하여 위험도와 투자 적합성을 판단합니다</p>
        </div>
      </section>

      {/* SUB NAV */}
      <div className={s.snavWrap} ref={snavRef}>
        <div className={s.snavIn}>
          <nav className={s.snav}>
            {TABS.filter((t) => !t.gated || hasResult).map((t) => (
              <button
                key={t.id}
                className={`${s.snavBtn} ${effectiveTab === t.id ? s.on : ""}`}
                onClick={() => handleTabClick(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* PANEL: 권리관계 분석 */}
      <div className={`${s.tab} ${effectiveTab === "analysis" ? s.on : ""}`}>
        <div className={s.panelWrap}>
          <div className={s.analysisGrid}>
            {/* Left: 입력 폼 */}
            <RightsAnalysisForm
              step={step}
              tilkoAddress={tilkoAddress}
              setTilkoAddress={setTilkoAddress}
              tilkoFetching={tilkoFetching}
              isExtracting={isExtracting}
              fileName={fileName}
              rawText={rawText}
              estimatedPrice={estimatedPrice}
              setEstimatedPrice={setEstimatedPrice}
              setInputMode={setInputMode}
              setTilkoSource={setTilkoSource}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleAddressAnalyze={handleAddressAnalyze}
              handleAnalyze={handleAnalyze}
            />

            {/* Right: 결과 */}
            <div>
              <RightsResultPanel
                step={step}
                result={result}
                error={error}
                ownerMatch={ownerMatch}
                registryOwnerMasked={registryOwnerMasked}
                rawText={rawText}
              />
            </div>
          </div>

          <RightsMarketingSections onStart={scrollToNav} />
        </div>
      </div>

      {/* 보조 탭 */}
      <RightsSecondaryTabs
        activeTab={effectiveTab}
        result={result}
        ownerMatch={ownerMatch}
        registryOwnerMasked={registryOwnerMasked}
      />

      <RightsRenewalFooter />
    </>
  );
}
