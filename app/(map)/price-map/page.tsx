"use client";

import { usePriceMap } from "./hooks/usePriceMap";
import { LeftPanel } from "./components/LeftPanel";
import { RiskPopup } from "./components/RiskPopup";
import { MapOverlay } from "./components/MapOverlay";

export default function PriceMapPage() {
  const {
    mapRef, data, selectedGu, setSelectedGu,
    selectedApt, loading, showGuDropdown, setShowGuDropdown,
    selectedSido, setSelectedSido, tradeType, setTradeType,
    riskPopup, setRiskPopup,
    selectAndMoveToApt, topChanges, mapStatus, debugState,
  } = usePriceMap();

  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        <LeftPanel
          selectedGu={selectedGu}
          setSelectedGu={setSelectedGu}
          selectedApt={selectedApt}
          loading={loading}
          showGuDropdown={showGuDropdown}
          setShowGuDropdown={setShowGuDropdown}
          selectedSido={selectedSido}
          setSelectedSido={setSelectedSido}
          tradeType={tradeType}
          setTradeType={setTradeType}
          topChanges={topChanges}
          selectAndMoveToApt={selectAndMoveToApt}
          setRiskPopup={setRiskPopup}
        />

        {riskPopup && (
          <RiskPopup
            popup={riskPopup}
            selectedGu={selectedGu}
            onClose={() => setRiskPopup(null)}
          />
        )}

        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <MapOverlay loading={loading} total={data?.total || 0} />
          <div className="absolute right-3 top-3 z-30 rounded bg-black/70 px-2 py-1 text-[11px] text-white">
            {mapStatus} / {debugState}
          </div>
          <div ref={mapRef} className="absolute inset-0" />
          {mapStatus !== "ready" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  {mapStatus === "loading" ? "카카오 지도를 불러오는 중입니다." : "카카오 지도 연결을 확인하는 중입니다."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {mapStatus === "loading" ? "잠시만 기다려 주세요." : "페이지를 새로고침하면 다시 시도합니다."}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
