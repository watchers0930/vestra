"use client";

import s from "../listings-map.module.css";
import { MapSlidePanelPhotos } from "@/app/(app)/listings/components/MapSlidePanelPhotos";
import { MapSlidePanelInfo, type ListingSlideData } from "@/app/(app)/listings/components/MapSlidePanelInfo";

interface Props {
  detailOpen: boolean;
  slideData: ListingSlideData | null;
  closeDetail: () => void;
  goToDetail: () => void;
}

export default function MapDetailPanel({ detailOpen, slideData, closeDetail, goToDetail }: Props) {
  return (
    <>
      {/* OVERLAY BACKDROP */}
      <div className={`${s.detailOverlay} ${detailOpen ? s.open : ""}`} onClick={closeDetail}></div>

      {/* RIGHT: DETAIL PANEL — 앱 MapSlidePanel 형식 */}
      <div className={`${s.mapDetailPanel} ${detailOpen ? s.open : ""}`}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#fff" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #EEF1F8", padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>매매 · 아파트</span>
            </div>
            <button onClick={closeDetail} title="닫기" style={{ borderRadius: 8, padding: 6, color: "#6e6e73", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          </div>

          {/* 콘텐츠 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {slideData && (
              <>
                <MapSlidePanelPhotos photos={slideData.photos} alt={slideData.address} lat={slideData.latitude} lng={slideData.longitude} />
                <MapSlidePanelInfo data={slideData} />
                <div style={{ borderTop: "1px solid #EEF1F8", padding: "16px 20px" }}>
                  <button
                    onClick={goToDetail}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#0071e3", padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    상세보기 · 계약의향서 보내기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
