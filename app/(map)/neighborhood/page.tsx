"use client";

import { Eye, EyeOff } from "lucide-react";
import { useNeighborhoodData, type FacilityGroup } from "./hooks/useNeighborhoodData";
import { NeighborhoodPanel } from "./components/NeighborhoodPanel";
import { MobileNeighborhoodSheet } from "./components/MobileNeighborhoodSheet";

export default function NeighborhoodMapPage() {
  const {
    mapRef, address, setAddress,
    loading, result, error,
    expandedCats, visibleFacilities,
    toggleCat, handleAnalyze,
    toggleFacility, toggleAllFacilities, navigateTo,
  } = useNeighborhoodData();

  const panelProps = {
    address, setAddress, loading, result, error,
    expandedCats, visibleFacilities,
    toggleCat, handleAnalyze,
    toggleFacility, toggleAllFacilities, navigateTo,
  };

  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        {/* 데스크톱 좌측 패널 — hidden lg:flex */}
        <NeighborhoodPanel {...panelProps} />

        {/* 카카오맵 */}
        <div className="relative flex-1">
          <div ref={mapRef} className="absolute inset-0" />

          {/* 지도 위 범례 */}
          {result && result.facilities && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-[12px] rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-black/[0.08] p-3 px-3.5 max-h-[280px] overflow-y-auto">
              <p className="text-[10px] font-bold text-[#aeaeb2] tracking-[0.08em] uppercase mb-2.5">범례</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(result.facilities).map(([key, fac]) => {
                  const f = fac as FacilityGroup;
                  const visible = visibleFacilities.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleFacility(key)}
                      className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 transition-opacity"
                      style={{ opacity: visible ? 1 : 0.3 }}
                    >
                      <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: f.color }} />
                      <span className="text-[11px] text-[#3d3d3f]">{f.label}</span>
                      {visible
                        ? <Eye size={10} strokeWidth={1.5} className="text-[#aeaeb2]" />
                        : <EyeOff size={10} strokeWidth={1.5} className="text-[#aeaeb2]" />
                      }
                    </button>
                  );
                })}
                <div className="flex items-center gap-2 pt-1.5 border-t border-black/[0.07] mt-0.5">
                  <div className="w-[9px] h-[9px] rounded-full border-2 border-[#0071e3] bg-[rgba(0,113,227,0.12)] flex-shrink-0" />
                  <span className="text-[11px] text-[#3d3d3f]">반경 1km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 바텀시트 — lg:hidden */}
      <MobileNeighborhoodSheet {...panelProps} />
    </div>
  );
}
