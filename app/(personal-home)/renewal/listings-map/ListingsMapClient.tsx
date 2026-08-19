"use client";

import { useState, useEffect } from "react";
import s from "./listings-map.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { ClusterMarkerMap } from "./ClusterMarkerMap";
import { useListingsMap } from "./hooks/useListingsMap";
import { formatEok } from "./lib/format";
import MapFilterRow from "./components/MapFilterRow";
import MapListPanel from "./components/MapListPanel";
import MapDetailPanel from "./components/MapDetailPanel";
import ListingsMapFooter from "./components/ListingsMapFooter";

export default function ListingsMapClient() {
  const {
    openDropdown, filterLabels, filterActive, selectedOpts,
    toggleDropdown, selectOption, filterRowRef,
    sido, sigungu, sigunguList, updateSigungu, setSigungu,
    region, items, loadingItems, markers,
    detailOpen, activeItem, slideData, panTo,
    openDetail, goToDetail, closeDetail,
  } = useListingsMap();

  const selectedMarker = activeItem != null && items[activeItem]?.lat != null
    ? { lat: items[activeItem].lat!, lng: items[activeItem].lng!, label: formatEok(items[activeItem].dealAmount) }
    : null;

  // 카카오 SDK 준비 완료 후 지도 마운트 (콜드 로드 시 지도 미생성 방지)
  const [kakaoReady, setKakaoReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as { kakao?: { maps?: { Map?: unknown } }; __kakaoMapsReady?: boolean };
    if (w.kakao?.maps?.Map || w.__kakaoMapsReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKakaoReady(true);
      return;
    }
    const onReady = () => setKakaoReady(true);
    window.addEventListener("kakao-maps-ready", onReady);
    const timer = setInterval(() => {
      if (w.kakao?.maps?.Map) { setKakaoReady(true); clearInterval(timer); }
    }, 300);
    return () => { window.removeEventListener("kakao-maps-ready", onReady); clearInterval(timer); };
  }, []);

  return (
    <>
      {/* NAV */}
      <RenewalGnb active="listings" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroInner}>
          <p className={s.subHeroText}>
            베스트라의 매물은 안심인증등록제로 운영되어
            <br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      {/* MAP SECTION */}
      <section className={s.mapSection}>
        <div className={s.mapSectionHeader}>
          <h2 className={s.mapSectionTitle}>베스트라 인증 안심전세 매물</h2>
        </div>

        {/* FILTER ROW */}
        <MapFilterRow
          filterRowRef={filterRowRef}
          openDropdown={openDropdown}
          filterLabels={filterLabels}
          filterActive={filterActive}
          selectedOpts={selectedOpts}
          toggleDropdown={toggleDropdown}
          selectOption={selectOption}
          sido={sido}
          sigungu={sigungu}
          sigunguList={sigunguList}
          updateSigungu={updateSigungu}
          setSigungu={setSigungu}
        />

        {/* 3-PANEL */}
        <div className={s.mapPanels}>
          {/* LEFT: LIST PANEL */}
          <MapListPanel
            region={region}
            loadingItems={loadingItems}
            items={items}
            activeItem={activeItem}
            openDetail={openDetail}
          />

          {/* CENTER: MAP (클러스터 + 선택 시 물방울) */}
          <div className={s.mapCenter}>
            {kakaoReady && (
              <ClusterMarkerMap
                items={markers}
                selected={selectedMarker}
                onMarkerClick={(id) => openDetail(Number(id))}
                panTo={panTo}
              />
            )}
          </div>

          {/* RIGHT: DETAIL PANEL + OVERLAY */}
          <MapDetailPanel
            detailOpen={detailOpen}
            slideData={slideData}
            closeDetail={closeDetail}
            goToDetail={goToDetail}
          />
        </div>
      </section>

      {/* 콘텐츠-푸터 사이 여백 */}
      <div style={{ height: 50 }} />

      {/* FOOTER */}
      <ListingsMapFooter />
    </>
  );
}
