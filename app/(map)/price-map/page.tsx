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
    selectAndMoveToApt, topChanges,
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
          <div ref={mapRef} className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
