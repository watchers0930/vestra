"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Building2 } from "lucide-react";
import { useListings, type ListingItem, type ListingType } from "../hooks/useListings";
import { MapSlidePanel } from "./MapSlidePanel";
import type { ListingSlideData } from "./MapSlidePanelInfo";

// ────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────
interface Marker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  listing: ListingItem;
}

// ────────────────────────────────────────────────────────────
// 가격 포맷 (마커 라벨용)
// ────────────────────────────────────────────────────────────
function formatMarkerLabel(deposit: string): string {
  const num = parseInt(deposit, 10);
  if (!num) return "문의";
  if (num >= 100_000_000) {
    const eok = Math.floor(num / 100_000_000);
    const rest = Math.floor((num % 100_000_000) / 10_000);
    return rest > 0 ? `${eok}억${rest}만` : `${eok}억`;
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000)}만`;
  return `${num}원`;
}

// ────────────────────────────────────────────────────────────
// 카카오맵 마커 컴포넌트 (내부용)
// ────────────────────────────────────────────────────────────
interface KakaoMarkersMapProps {
  markers: Marker[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  panTo: { lat: number; lng: number } | null;
}

function KakaoMarkersMap({ markers, activeId, onMarkerClick, panTo }: KakaoMarkersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    const init = () => {
      if (mapInstanceRef.current) return;
      const map = new window.kakao.maps.Map(mapRef.current!, {
        center: new window.kakao.maps.LatLng(37.5172, 127.0473),
        level: 7,
      });
      mapInstanceRef.current = map;
    };

    if (typeof window.kakao.maps.load === "function") {
      window.kakao.maps.load(init);
    } else {
      init();
    }
  }, []);

  // 마커 갱신
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps) return;

    // 기존 오버레이 제거
    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    markers.forEach((m) => {
      const isActive = m.id === activeId;
      const content = `
        <div style="
          display:inline-flex;align-items:center;padding:5px 10px;
          background:${isActive ? "#0071e3" : "#fff"};
          color:${isActive ? "#fff" : "#1d1d1f"};
          border:2px solid ${isActive ? "#0071e3" : "#d1d1d6"};
          border-radius:20px;font-size:12px;font-weight:700;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          cursor:pointer;white-space:nowrap;
          transform:translateY(-50%);
        ">${m.label}</div>
      `;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(m.lat, m.lng),
        content,
        yAnchor: 1,
        clickable: true,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);

      // 클릭 이벤트 (DOM에 직접)
      const el = overlay.getContent();
      if (el && typeof el !== "string") {
        el.addEventListener("click", () => onMarkerClick(m.id));
      }
    });
  }, [markers, activeId, onMarkerClick]);

  // panTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !panTo || !window.kakao?.maps) return;
    map.panTo(new window.kakao.maps.LatLng(panTo.lat, panTo.lng));
  }, [panTo]);

  return <div ref={mapRef} className="h-full w-full" />;
}

// ────────────────────────────────────────────────────────────
// 사이드바 카드 리스트
// ────────────────────────────────────────────────────────────
function ListingCardSmall({
  listing,
  isActive,
  onClick,
}: {
  listing: ListingItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const depositNum = parseInt(listing.deposit, 10);
  const depositStr = formatMarkerLabel(listing.deposit);
  const typeLabel  = listing.listingType === "JEONSE" ? "전세" : "매매";
  const photos     = listing.photos as string[] | null;

  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-[#f0f0f5]",
        isActive ? "bg-[#EFF5FF]" : "bg-white hover:bg-[#f9f9fb]",
      ].join(" ")}
    >
      {/* 썸네일 */}
      <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[#EEF1F8]">
        {photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
          </div>
        )}
      </div>
      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${listing.listingType === "JEONSE" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
            {typeLabel}
          </span>
          {listing.roomType && (
            <span className="text-[10px] text-[#aeaeb2]">{listing.roomType}</span>
          )}
        </div>
        <p className="text-[13px] font-bold text-[#1d1d1f]">
          {depositStr}원
        </p>
        <p className="text-[11px] text-[#6e6e73] truncate mt-0.5">{listing.address}</p>
        {listing.isCertified && (
          <span className="inline-block mt-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
            안심인증
          </span>
        )}
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
export function ListingsMapView() {
  const [typeFilter,  setTypeFilter]  = useState<ListingType | "ALL">("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [panTo,       setPanTo]       = useState<{ lat: number; lng: number } | null>(null);
  const [panelData,   setPanelData]   = useState<ListingSlideData | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError,  setPanelError]  = useState<string | null>(null);
  const isPanelOpen = activeId !== null;

  const { listings, loading } = useListings(typeFilter === "ALL" ? undefined : typeFilter);

  const markers = useMemo<Marker[]>(() => {
    return listings
      .filter((l) => l.latitude && l.longitude)
      .map((l) => ({
        id:      l.id,
        lat:     l.latitude!,
        lng:     l.longitude!,
        label:   formatMarkerLabel(l.deposit),
        listing: l,
      }));
  }, [listings]);

  // 초기 지도 중심 자동 이동
  const initialRef = useRef(false);
  useEffect(() => {
    if (!initialRef.current && markers.length > 0) {
      initialRef.current = true;
      setPanTo({ lat: markers[0].lat, lng: markers[0].lng });
    }
  }, [markers]);

  const openPanel = useCallback(async (id: string) => {
    setActiveId(id);
    setPanelData(null);
    setPanelError(null);
    setPanelLoading(true);

    const listing = listings.find((l) => l.id === id);
    if (listing?.latitude && listing?.longitude) {
      setPanTo({ lat: listing.latitude, lng: listing.longitude });
    }

    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error("매물을 불러오지 못했습니다.");
      const data = await res.json();
      setPanelData({
        id:            data.id,
        listingType:   data.listingType,
        address:       data.address,
        roomType:      data.roomType,
        size:          data.size,
        floor:         data.floor,
        totalFloor:    data.totalFloor,
        deposit:       data.deposit?.toString() ?? "0",
        managementFee: data.managementFee?.toString() ?? null,
        duration:      data.duration,
        photos:        data.photos as string[] | null,
        description:   data.description,
        isCertified:   data.isCertified,
        jeonseRatio:   data.jeonseRatio,
        officialPrice: data.officialPrice?.toString() ?? null,
        latitude:      data.latitude,
        longitude:     data.longitude,
        availableFrom: data.availableFrom,
        owner:         data.owner,
      });
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setPanelLoading(false);
    }
  }, [listings]);

  const closePanel = useCallback(() => {
    setActiveId(null);
    setPanelData(null);
    setPanelError(null);
  }, []);

  const handleReset = useCallback(() => {
    setTypeFilter("ALL");
    initialRef.current = false;
  }, []);

  const TYPE_TABS: { value: ListingType | "ALL"; label: string }[] = [
    { value: "ALL",    label: "전체" },
    { value: "JEONSE", label: "전세" },
    { value: "SALE",   label: "매매" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* 필터 바 */}
      <div className="z-20 flex shrink-0 items-center gap-2 border-b border-[#e8e8ed] bg-white px-4 py-2">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={[
              "px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors border",
              typeFilter === t.value
                ? "bg-[#0071e3] text-white border-[#0071e3]"
                : "bg-white text-[#3d3d3f] border-[#d1d1d6] hover:border-[#0071e3]/50",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={handleReset}
          title="필터 초기화"
          className="ml-auto flex items-center justify-center rounded-lg border border-[#e8e8ed] p-[7px] text-[#6e6e73] hover:border-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <span className="text-[12px] text-[#aeaeb2]">
          {loading ? "검색 중…" : `${markers.length}건`}
        </span>
      </div>

      {/* 바디: 사이드바 + 지도 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 사이드바 */}
        <aside className={[
          "shrink-0 flex-col overflow-hidden border-r border-[#e8e8ed] bg-white",
          "transition-[width] duration-300",
          "hidden md:flex",
          sidebarOpen ? "md:w-[340px]" : "md:w-0",
        ].join(" ")}>
          <div className="shrink-0 flex items-center gap-2 border-b border-[#EEF1F8] px-4 py-2.5">
            <span className="text-[14px] font-bold text-[#1d1d1f]">매물 목록</span>
            <span className="text-[12px] text-[#6e6e73]">
              {loading ? "…" : `${listings.length}건`}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d1d1d6] border-t-[#0071e3]" />
              </div>
            ) : listings.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-[#aeaeb2]">
                <Building2 className="h-7 w-7" strokeWidth={1.5} />
                <p className="text-[13px]">매물이 없습니다</p>
              </div>
            ) : (
              listings.map((l) => (
                <ListingCardSmall
                  key={l.id}
                  listing={l}
                  isActive={l.id === activeId}
                  onClick={() => openPanel(l.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* 사이드바 토글 버튼 */}
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          title={sidebarOpen ? "목록 숨기기" : "목록 보기"}
          className="z-20 hidden md:flex h-12 w-5 shrink-0 items-center justify-center self-center rounded-r-lg border border-l-0 border-[#e8e8ed] bg-white text-[#6e6e73] shadow-sm transition-colors hover:text-[#0071e3] focus:outline-none"
        >
          {sidebarOpen
            ? <ChevronLeft  className="h-3 w-3" strokeWidth={2.5} />
            : <ChevronRight className="h-3 w-3" strokeWidth={2.5} />}
        </button>

        {/* 지도 영역 */}
        <div className="relative flex-1 overflow-hidden">
          <KakaoMarkersMap
            markers={markers}
            activeId={activeId}
            onMarkerClick={openPanel}
            panTo={panTo}
          />

          {/* 슬라이드 패널 */}
          <div className={[
            "absolute inset-y-0 right-0 z-10 w-full md:w-[360px]",
            "bg-white shadow-[-4px_0_28px_rgba(0,0,0,0.10)]",
            "transition-transform duration-300 ease-in-out",
            isPanelOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}>
            <MapSlidePanel
              listingId={activeId}
              data={panelData}
              loading={panelLoading}
              error={panelError}
              onClose={closePanel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
