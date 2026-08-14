"use client";

import { useState, useRef, useEffect } from "react";
import s from "./price-map-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import KakaoScript from "@/components/common/KakaoScript";
import { usePriceMap } from "@/app/(map)/price-map/hooks/usePriceMap";
import { usePredictionData } from "@/app/(app)/prediction/hooks/usePredictionData";
import PriceMapLeftPanel from "./components/PriceMapLeftPanel";
import AptDetailPanel from "./components/AptDetailPanel";
import RiskPopupRenewal from "./components/RiskPopupRenewal";
import ForecastView from "./components/ForecastView";
import type { AptData } from "@/app/(map)/price-map/types";

export default function PriceMapRenewalClient() {
  const pm = usePriceMap();
  const {
    mapRef, selectedGu, setSelectedGu, selectedSido, setSelectedSido,
    selectedApt, setSelectedApt, tradeType, setTradeType,
    propertyType, setPropertyType, topChanges, loading, mapStatus,
    officialPriceLabel, riskPopup, setRiskPopup, selectAndMoveToApt, analyzeRisk,
  } = pm;

  const prediction = usePredictionData();
  const { roadResult, setRoadResult, buildingName, setBuildingName, handleAnalyze } = prediction;
  const [forecastOpen, setForecastOpen] = useState(false);
  // 분석 대기 중인 지역·단지 — ref로 관리(리렌더/cascading setState 방지)
  const pendingRef = useRef<{ region: string; apt: string } | null>(null);
  // 이미 조회한 지역|단지 키 — 동일 물건 재클릭 시 중복 API 호출 방지
  const analyzedKeyRef = useRef<string>("");

  // roadResult+buildingName이 요청값으로 반영된 시점(fresh closure)에 분석 실행
  useEffect(() => {
    const p = pendingRef.current;
    if (!p || roadResult !== p.region || buildingName !== p.apt) return;
    pendingRef.current = null;
    handleAnalyze();
  }, [roadResult, buildingName, handleAnalyze]);

  function handleSelectApt(apt: AptData) {
    selectAndMoveToApt(apt);
  }

  function openForecast() {
    if (!selectedApt) return;
    setForecastOpen(true);
    // 지역비교를 위해 동 단위 주소로 조회(지역 전체 실거래) + 대상 단지는 buildingName으로 특정
    const region = `${selectedSido === "서울" ? "서울특별시" : selectedSido} ${selectedGu} ${selectedApt.dong}`;
    const key = `${region}|${selectedApt.name}`;
    if (analyzedKeyRef.current === key) return; // 이미 분석한 물건이면 재호출 생략
    analyzedKeyRef.current = key;
    setBuildingName(selectedApt.name);
    setRoadResult(region);
    pendingRef.current = { region, apt: selectedApt.name };
  }

  return (
    <div className={s.pageShell}>
      <KakaoScript />

      {/* NAV */}
      <RenewalGnb active="price-map" />

      {/* MAP SHELL */}
      <div className={s.mapShell}>
        <PriceMapLeftPanel
          selectedGu={selectedGu}
          setSelectedGu={setSelectedGu}
          selectedSido={selectedSido}
          setSelectedSido={setSelectedSido}
          tradeType={tradeType}
          setTradeType={setTradeType}
          propertyType={propertyType}
          setPropertyType={setPropertyType}
          topChanges={topChanges}
          loading={loading}
          selectedApt={selectedApt}
          onSelectApt={handleSelectApt}
        />

        {/* MAP CENTER */}
        <div className={s.mapCenter}>
          <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
          {mapStatus !== "ready" && (
            <div className={s.mapPlaceholder} style={{ position: "absolute", inset: 0 }}>
              <div className={s.mapPlaceholderInner}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
                </svg>
                <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>
                  {mapStatus === "loading" ? "지도를 불러오는 중…" : "지도 연결 확인 중…"}
                </span>
              </div>
            </div>
          )}
          <div className={s.mapLegend}>
            <div className={s.mlTitle}>평형별</div>
            <div className={s.mlItems}>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#1e3a5f" }} />40평 이상</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#3b82f6" }} />30평대</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#60a5fa" }} />20평대</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#93c5fd" }} />10평대</div>
            </div>
          </div>
        </div>

        {/* APT SLIDE PANEL */}
        <div className={`${s.aptPanel} ${selectedApt ? s.open : ""}`}>
          {selectedApt && (
            <AptDetailPanel
              apt={selectedApt}
              tradeType={tradeType}
              officialPriceLabel={officialPriceLabel}
              onClose={() => setSelectedApt(null)}
              onRisk={() => setRiskPopup({ apt: selectedApt, risk: analyzeRisk(selectedApt) })}
              onForecast={openForecast}
            />
          )}
        </div>
      </div>

      {/* RISK POPUP */}
      <RiskPopupRenewal
        open={!!riskPopup}
        popup={riskPopup}
        onClose={() => setRiskPopup(null)}
      />

      {/* FORECAST OVERLAY */}
      <ForecastView
        open={forecastOpen}
        apt={selectedApt}
        tradeType={tradeType}
        prediction={prediction}
        onClose={() => setForecastOpen(false)}
      />
    </div>
  );
}
