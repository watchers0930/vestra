"use client";

import { usePriceMap } from "./hooks/usePriceMap";
import { LeftPanel } from "./components/LeftPanel";
import { MobileMapSheet } from "./components/MobileMapSheet";
import { RiskPopup } from "./components/RiskPopup";
import { MapOverlay } from "./components/MapOverlay";
import { AptSlidePanel } from "./components/AptSlidePanel";

export default function PriceMapPage() {
  const {
    mapRef, data, selectedGu, setSelectedGu,
    selectedApt, setSelectedApt, loading, showGuDropdown, setShowGuDropdown,
    selectedSido, setSelectedSido, tradeType, setTradeType,
    propertyType, setPropertyType,
    riskPopup, setRiskPopup,
    selectAndMoveToApt, topChanges, mapStatus,
    officialPriceLabel,
  } = usePriceMap();

  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        <LeftPanel
          selectedGu={selectedGu}
          setSelectedGu={setSelectedGu}
          loading={loading}
          showGuDropdown={showGuDropdown}
          setShowGuDropdown={setShowGuDropdown}
          selectedSido={selectedSido}
          setSelectedSido={setSelectedSido}
          tradeType={tradeType}
          setTradeType={setTradeType}
          propertyType={propertyType}
          setPropertyType={setPropertyType}
          topChanges={topChanges}
          selectAndMoveToApt={selectAndMoveToApt}
        />

        {riskPopup && (
          <RiskPopup
            popup={riskPopup}
            selectedGu={selectedGu}
            onClose={() => setRiskPopup(null)}
          />
        )}

        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <MapOverlay loading={loading} total={data?.total || 0} propertyType={propertyType} />
          <div ref={mapRef} className="absolute inset-0" />
          {mapStatus === "loading" ? (
            <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
              <p className="text-sm font-semibold text-slate-900">카카오 지도를 불러오는 중입니다.</p>
              <p className="mt-1 text-xs text-slate-500">지도는 먼저 표시되고 마커는 뒤이어 채워집니다.</p>
            </div>
          ) : null}
          {mapStatus === "error" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-900">카카오 지도 연결을 확인하는 중입니다.</p>
                <p className="mt-1 text-xs text-slate-500">페이지를 새로고침하면 다시 시도합니다.</p>
              </div>
            </div>
          ) : null}

          {/* 아파트 선택 시 우측 슬라이드 패널 */}
          <div
            className={[
              "absolute inset-y-0 right-0 z-10 w-[340px]",
              "bg-white shadow-[-4px_0_28px_rgba(0,0,0,0.10)]",
              "transition-transform duration-300 ease-in-out",
              selectedApt ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            {selectedApt && (
              <AptSlidePanel
                apt={selectedApt}
                tradeType={tradeType}
                officialPriceLabel={officialPriceLabel}
                onClose={() => setSelectedApt(null)}
                onRiskPopup={setRiskPopup}
              />
            )}
          </div>
        </div>
      </div>

      <MobileMapSheet
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
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        topChanges={topChanges}
        selectAndMoveToApt={selectAndMoveToApt}
        setRiskPopup={setRiskPopup}
        officialPriceLabel={officialPriceLabel}
      />
    </div>
  );
}
