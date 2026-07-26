"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, Building2, X, Plus } from "lucide-react";
import { useListings, type ListingItem, type ListingType } from "../hooks/useListings";
import { KakaoMarkersMap, type MapMarker } from "./KakaoMarkersMap";
import { MapSlidePanel } from "./MapSlidePanel";
import type { ListingSlideData } from "./MapSlidePanelInfo";
import { REGIONS } from "@/lib/regions";

// ────────────────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────────────────
const LISTING_TABS: { value: ListingType | "ALL"; label: string }[] = [
  { value: "ALL",    label: "전체" },
  { value: "JEONSE", label: "전세" },
  { value: "SALE",   label: "매매" },
];

const ROOM_TYPES = [
  { value: "",       label: "전체 유형" },
  { value: "아파트",   label: "아파트" },
  { value: "빌라",    label: "빌라" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "단독주택", label: "단독주택" },
  { value: "원룸/투룸", label: "원룸/투룸" },
];

const ROOM_TYPE_TABS = [
  { value: "",       label: "전체" },
  { value: "아파트",   label: "아파트" },
  { value: "빌라",    label: "빌라" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "단독주택", label: "단독주택" },
  { value: "원룸/투룸", label: "원룸" },
];

const SIZE_OPTIONS = [
  { label: "전체 평형", min: undefined, max: undefined },
  { label: "10평 이하", min: undefined, max: 33 },
  { label: "10~20평",   min: 33,        max: 66 },
  { label: "20~30평",   min: 66,        max: 99 },
  { label: "30평 이상", min: 99,        max: undefined },
];

// ────────────────────────────────────────────────────────────
// 가격 포맷
// ────────────────────────────────────────────────────────────
function formatMarkerLabel(deposit: string): string {
  const num = parseInt(deposit, 10);
  if (!num) return "문의";
  if (num >= 100_000_000) {
    const eok  = Math.floor(num / 100_000_000);
    const rest = Math.floor((num % 100_000_000) / 10_000);
    return rest > 0 ? `${eok}억${rest}만` : `${eok}억`;
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000)}만`;
  return `${num}원`;
}

// ────────────────────────────────────────────────────────────
// 사이드바 카드
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
  const depositStr = formatMarkerLabel(listing.deposit);
  const typeLabel  = listing.listingType === "JEONSE" ? "전세" : "매매";
  const photos     = listing.photos as string[] | null;

  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-black/30",
        isActive ? "bg-[#EFF5FF]" : "bg-white hover:bg-[#f9f9fb]",
      ].join(" ")}
    >
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${listing.listingType === "JEONSE" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
            {typeLabel}
          </span>
          {listing.roomType && (
            <span className="text-[10px] text-[#aeaeb2]">{listing.roomType}</span>
          )}
        </div>
        <p className="text-[13px] font-bold text-[#1d1d1f]">{depositStr}</p>
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
// Props
// ────────────────────────────────────────────────────────────
interface ListingsMapViewProps {
  onClose: () => void;
  canRegister?: boolean;
}

// ────────────────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────────────────
export function ListingsMapView({ onClose, canRegister }: ListingsMapViewProps) {
  const [listingType, setListingType] = useState<ListingType | "ALL">("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [sidebarRoomType, setSidebarRoomType] = useState("");
  const [selectedSi, setSelectedSi] = useState("서울특별시");
  const [selectedGu, setSelectedGu] = useState("강남구");
  const [sizeIdx,  setSizeIdx]  = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);
  const [panelData, setPanelData] = useState<ListingSlideData | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [currentDong, setCurrentDong] = useState("");
  const [currentGu,   setCurrentGu]   = useState("");
  const isPanelOpen = activeId !== null;

  const regionData = REGIONS.find((r) => r.si === selectedSi);
  const size = SIZE_OPTIONS[sizeIdx];

  // 필터 드롭다운(roomType) + 시/구를 합쳐 API에 전달
  const effectiveRoomType = roomTypeFilter || sidebarRoomType || undefined;
  const effectiveRegion   = selectedGu || selectedSi || undefined;

  const { listings, loading } = useListings(
    listingType === "ALL" ? undefined : listingType,
    {
      roomType: effectiveRoomType,
      region:   effectiveRegion,
      minSize:  size.min,
      maxSize:  size.max,
    },
  );

  const markers = useMemo<MapMarker[]>(() =>
    listings
      .filter((l) => l.latitude && l.longitude)
      .map((l) => ({
        id:    l.id,
        lat:   l.latitude!,
        lng:   l.longitude!,
        label: formatMarkerLabel(l.deposit),
      })),
    [listings],
  );

  // 초기 지도 이동
  const initialRef = useRef(false);
  useEffect(() => {
    if (!initialRef.current && markers.length > 0) {
      initialRef.current = true;
      setPanTo({ lat: markers[0].lat, lng: markers[0].lng });
    }
  }, [markers]);

  const handleRegionChange = useCallback((dong: string, gu: string, si: string) => {
    setCurrentDong(dong);
    setCurrentGu(gu);
    // 지도 이동 시 시/구 드롭다운 자동 동기화
    if (si && si !== selectedSi) setSelectedSi(si);
    if (gu && gu !== selectedGu) setSelectedGu(gu);
  }, [selectedSi, selectedGu]);

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
    setListingType("ALL");
    setRoomTypeFilter("");
    setSidebarRoomType("");
    setSelectedSi("서울특별시");
    setSelectedGu("강남구");
    setSizeIdx(0);
    initialRef.current = false;
  }, []);

  const displayRegion = currentDong
    ? `${currentDong}`
    : currentGu || selectedGu || selectedSi || "전국";

  return (
    <div className="fixed inset-0 z-40 lg:left-[272px] flex flex-col bg-white overflow-hidden">

      {/* Row 1: 닫기 + 유형 탭 + 매물등록/목록보기 */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E8EDF5", background: "#fff", padding: "0 16px", height: 52, flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <button
            onClick={onClose}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 12px 8px 0", fontSize: 13, fontWeight: 500, color: "#6e6e73", background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={16} strokeWidth={1.8} />닫기
          </button>
          <div style={{ width: 1, height: 18, background: "#E8EDF5", margin: "0 8px" }} />
          <nav style={{ display: "flex" }}>
            {LISTING_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setListingType(t.value)}
                style={{
                  padding: "14px 14px",
                  fontSize: 14,
                  fontWeight: 500,
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: listingType === t.value ? "2px solid #1d1d1f" : "2px solid transparent",
                  color: listingType === t.value ? "#1d1d1f" : "#8e8e93",
                  background: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canRegister && (
            <Link href="/listings/new" style={{ textDecoration: "none" }}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 10, background: "#0071e3", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                <Plus size={13} strokeWidth={2} />매물 등록
              </button>
            </Link>
          )}
          <button
            onClick={onClose}
            style={{ padding: "7px 13px", borderRadius: 10, background: "#f5f5f7", color: "#3d3d3f", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            목록
          </button>
        </div>
      </header>

      {/* Row 2: 필터 바 */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #E8EDF5", background: "#fff", flexShrink: 0, zIndex: 9 }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 8, padding: "8px 12px", overflowX: "auto" }}>
          <label style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "1px solid #DDE3EF", background: "#F8FAFF", padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}>
            <select value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)} style={{ background: "transparent", fontSize: 13, color: "#1d1d1f", outline: "none", cursor: "pointer", border: "none" }}>
              {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <div style={{ width: 1, height: 18, background: "#E8EDF5", flexShrink: 0 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #DDE3EF", background: "#F8FAFF", padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}>
            <select
              value={selectedSi}
              onChange={(e) => { setSelectedSi(e.target.value); setSelectedGu(""); }}
              style={{ background: "transparent", fontSize: 13, color: "#1d1d1f", outline: "none", cursor: "pointer", border: "none" }}
            >
              <option value="">시/도 전체</option>
              {REGIONS.map((r) => <option key={r.si} value={r.si}>{r.si}</option>)}
            </select>
            {regionData && regionData.gu.length > 0 && (
              <>
                <span style={{ color: "#DDE3EF" }}>/</span>
                <select
                  value={selectedGu}
                  onChange={(e) => setSelectedGu(e.target.value)}
                  style={{ background: "transparent", fontSize: 13, color: "#1d1d1f", outline: "none", cursor: "pointer", border: "none" }}
                >
                  <option value="">구/군 전체</option>
                  {regionData.gu.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </>
            )}
          </label>
          <label style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "1px solid #DDE3EF", background: "#F8FAFF", padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}>
            <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))} style={{ background: "transparent", fontSize: 13, color: "#1d1d1f", outline: "none", cursor: "pointer", border: "none" }}>
              {SIZE_OPTIONS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
            </select>
          </label>
          <button onClick={handleReset} title="필터 초기화" style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #DDE3EF", padding: 8, color: "#6e6e73", background: "#fff", cursor: "pointer", flexShrink: 0 }}>
            <RefreshCw size={14} strokeWidth={1.5} />
          </button>
        </div>
        <span style={{ flexShrink: 0, paddingRight: 16, fontSize: 12, color: "#8e8e93" }}>
          {loading ? "검색 중…" : `지도 내 ${markers.length}건`}
        </span>
      </div>

      {/* 바디: 사이드바 + 지도 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* 사이드바 */}
        <aside style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid #E8EDF5",
          background: "#fff",
          width: sidebarOpen ? 380 : 0,
          transition: "width 0.3s",
        }}>
          {/* 사이드바 타이틀 */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #EEF1F8", padding: "10px 16px" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", whiteSpace: "nowrap" }}>
              {displayRegion}
            </span>
            <span style={{ fontSize: 13, color: "#8e8e93", whiteSpace: "nowrap" }}>
              {loading ? "…" : `${listings.length}건`}
            </span>
          </div>
          {/* 건물유형 탭 */}
          <div style={{ flexShrink: 0, display: "flex", gap: 6, padding: "10px 12px", borderBottom: "1px solid #EEF1F8", overflowX: "auto" }}>
            {ROOM_TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setSidebarRoomType(t.value)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  flexShrink: 0,
                  background: sidebarRoomType === t.value ? "#1d1d1f" : "#f5f5f7",
                  color: sidebarRoomType === t.value ? "#fff" : "#3d3d3f",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* 매물 카드 목록 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", height: 128, alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #d1d1d6", borderTop: "2px solid #0071e3", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : listings.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", height: 128, alignItems: "center", justifyContent: "center", gap: 8, color: "#aeaeb2" }}>
                <Building2 size={28} strokeWidth={1.5} />
                <p style={{ fontSize: 13 }}>매물이 없습니다</p>
              </div>
            ) : (
              listings.map((l) => (
                <ListingCardSmall key={l.id} listing={l} isActive={l.id === activeId} onClick={() => openPanel(l.id)} />
              ))
            )}
          </div>
        </aside>

        {/* 사이드바 토글 버튼 */}
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          title={sidebarOpen ? "목록 숨기기" : "목록 보기"}
          style={{
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 20,
            alignSelf: "center",
            height: 48,
            borderRadius: "0 8px 8px 0",
            border: "1px solid #E8EDF5",
            borderLeft: "none",
            background: "#fff",
            color: "#6e6e73",
            boxShadow: "2px 0 6px rgba(0,0,0,0.06)",
            cursor: "pointer",
          }}
        >
          {sidebarOpen ? <ChevronLeft size={12} strokeWidth={2.5} /> : <ChevronRight size={12} strokeWidth={2.5} />}
        </button>

        {/* 지도 */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <KakaoMarkersMap
            markers={markers}
            activeId={activeId}
            onMarkerClick={openPanel}
            panTo={panTo}
            onRegionChange={handleRegionChange}
          />
          {/* 슬라이드 패널 */}
          <div style={{
            position: "absolute",
            inset: "0 0 0 auto",
            zIndex: 10,
            width: "min(360px, 100%)",
            background: "#fff",
            boxShadow: "-4px 0 28px rgba(0,0,0,0.10)",
            transition: "transform 0.3s ease-in-out",
            transform: isPanelOpen ? "translateX(0)" : "translateX(100%)",
          }}>
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
