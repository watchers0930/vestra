"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import s from "./listings-map-mobile.module.css";
import { ClusterMarkerMap } from "../listings-map/ClusterMarkerMap";
import { GANGNAM_TEST_LISTINGS } from "../listings-list/test-fixtures";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

/* ── 지도용 매물 아이템(안심매물 fixture 기반) ── */
interface MapItem {
  id: string;
  region: string;
  dong: string;
  aptName: string;
  area: number | null;
  floor: number | null;
  totalFloor: number | null;
  amount: number;
  photo: string | null;
  lat: number | null;
  lng: number | null;
  isJeonse: boolean;
  isCertified: boolean;
  roomType: string | null;
}

const DEFAULT_REGION = "강남구";
const CHIP_LABELS = ["전체", "매매", "전세", "단기임대", "아파트", "빌라", "안심인증"];

/** 원 단위 → "13억 5,000만원" */
function fullWon(won: number): string {
  const eok = Math.floor(won / 1e8);
  const man = Math.floor((won % 1e8) / 1e4);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

/** 마커 라벨용 축약 → "13억5,000만" */
function markerLabel(won: number): string {
  const eok = Math.floor(won / 1e8);
  const man = Math.floor((won % 1e8) / 1e4);
  if (eok > 0) return man > 0 ? `${eok}억${man.toLocaleString()}만` : `${eok}억`;
  return `${man.toLocaleString()}만`;
}

/** 주소 문자열 → 시군구/동/단지명 */
function toMapItem(l: ListingItem): MapItem {
  const parts = (l.address || "").trim().split(/\s+/);
  const region = parts.find((p) => p.endsWith("구") || p.endsWith("군") || (p.endsWith("시") && p !== parts[0])) ?? DEFAULT_REGION;
  const dong = parts.find((p) => /(동|가|읍|면)$/.test(p)) ?? "";
  const aptName = parts[parts.length - 1] ?? l.address;
  return {
    id: l.id,
    region,
    dong,
    aptName,
    area: l.size ?? null,
    floor: l.floor ?? null,
    totalFloor: l.totalFloor ?? null,
    amount: Number(l.deposit || 0),
    photo: l.photos?.[0] ?? null,
    lat: l.latitude ?? null,
    lng: l.longitude ?? null,
    isJeonse: l.listingType === "JEONSE",
    isCertified: !!l.isCertified,
    roomType: l.roomType ?? null,
  };
}

function detailHref(p: MapItem): string {
  return `/renewal/listing-db-detail?id=${encodeURIComponent(p.id)}`;
}

const imgPlaceholderStyle: React.CSSProperties = {
  background: "#e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  fontSize: 12,
};

/* ── Component ── */
export default function ListingsMapMobileClient() {
  const searchParams = useSearchParams();
  const REGION_NAME = searchParams.get("region") || DEFAULT_REGION;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("전체");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProp, setDetailProp] = useState<MapItem | null>(null);
  const [items, setItems] = useState<MapItem[]>([]);
  const [kakaoReady, setKakaoReady] = useState(false);

  // 카카오 SDK 준비 완료 후에 ClusterMarkerMap 마운트
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
      if (w.kakao?.maps?.Map) {
        setKakaoReady(true);
        clearInterval(timer);
      }
    }, 300);
    return () => {
      window.removeEventListener("kakao-maps-ready", onReady);
      clearInterval(timer);
    };
  }, []);

  // 안심매물(테스트 샘플)을 지도 목록으로. 운영 도메인에서는 노출하지 않음.
  useEffect(() => {
    const isProd = window.location.hostname === "vestra-plum.vercel.app";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(isProd ? [] : GANGNAM_TEST_LISTINGS.map(toMapItem));
  }, []);

  const geocoded = items.filter((p) => p.lat != null && p.lng != null);
  const geocodedCount = geocoded.length;

  const clusterItems = geocoded.map((p) => ({
    id: p.id,
    lat: p.lat as number,
    lng: p.lng as number,
    label: markerLabel(p.amount),
  }));

  const selectedMarker =
    detailProp && detailProp.lat != null && detailProp.lng != null
      ? { lat: detailProp.lat, lng: detailProp.lng, label: markerLabel(detailProp.amount) }
      : null;

  const panTo =
    detailProp && detailProp.lat != null && detailProp.lng != null
      ? { lat: detailProp.lat, lng: detailProp.lng }
      : null;

  function handleMarkerClick(id: string) {
    const p = items.find((x) => x.id === id);
    if (p) openDetail(p);
  }

  function openDetail(p: MapItem) {
    setDetailProp(p);
    setDetailOpen(true);
    if (sheetExpanded) setSheetExpanded(false);
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailProp(null);
  }

  function toggleSheet() {
    setSheetExpanded((v) => !v);
  }

  function renderCard(p: MapItem, expanded: boolean) {
    return (
      <div
        key={p.id}
        className={s.peekCard}
        style={expanded ? { width: "100%", flexShrink: 1 } : undefined}
        onClick={() => openDetail(p)}
      >
        <div
          className={s.peekCardImg}
          style={
            p.photo
              ? { backgroundImage: `url(${p.photo})`, backgroundSize: "cover", backgroundPosition: "center", ...(expanded ? { width: "120px", height: "90px" } : {}) }
              : (expanded ? { ...imgPlaceholderStyle, width: "120px", height: "90px" } : imgPlaceholderStyle)
          }
        >
          {!p.photo && "사진 없음"}
        </div>
        <div className={s.peekCardBody}>
          <div className={s.peekBadges}>
            <span className={`${s.peekBadge} ${s.pbSale}`} style={{ background: p.isJeonse ? "#2e4bd8" : undefined }}>{p.isJeonse ? "전세" : "매매"}</span>
            {p.isCertified && <span className={s.peekBadge} style={{ background: "#dcfce7", color: "#16a34a" }}>안심인증</span>}
          </div>
          <div className={s.peekPrice}>{fullWon(p.amount)}</div>
          <div className={s.peekAddr}>{p.region} {p.dong} {p.aptName}</div>
          <div className={s.peekMeta}>{p.area ?? "-"}㎡ · {p.floor ?? "-"}층 · {p.roomType ?? "아파트"}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Paperlogy','Apple SD Gothic Neo','Noto Sans KR',-apple-system,sans-serif", color: "#1a1d2e", WebkitFontSmoothing: "antialiased" }}>

      {/* NAV */}
      <nav className={s.nav}>
        <Link href="/" className={s.navLogo}>
          <div className={s.navLogoIcon}>V</div>
          <span className={s.navLogoText}>VESTRA</span>
        </Link>
        <div className={s.navRight}>
          <Link href="/renewal/listings-list" className={s.navListBtn}>
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6">
              <line x1="1" y1="3" x2="14" y2="3" />
              <line x1="1" y1="7.5" x2="14" y2="7.5" />
              <line x1="1" y1="12" x2="14" y2="12" />
            </svg>
            목록
          </Link>
          <button
            className={`${s.navHam} ${menuOpen ? s.open : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li><a href="/renewal/listings-list">매물검색</a></li>
          <li><a href="/renewal/jeonse">전세보호</a></li>
          <li><a href="/renewal/rights">권리분석</a></li>
          <li><a href="/renewal/monitoring">등기감시</a></li>
          <li><a href="/renewal/contract">계약검토</a></li>
          <li><a href="/renewal/price-map">시세전망</a></li>
          <li><a href="/renewal/expert">전문가상담</a></li>
        </ul>
      </nav>

      {/* MAP AREA */}
      <div className={s.mapArea}>

        {/* KAKAO MAP */}
        <div className={s.kakaoMap}>
          {kakaoReady && (
            <ClusterMarkerMap
              items={clusterItems}
              selected={selectedMarker}
              onMarkerClick={handleMarkerClick}
              panTo={panTo}
            />
          )}
        </div>

        {/* 좌표 없음 안내 오버레이 */}
        {geocodedCount === 0 && (
          <div className={s.mapOverlayMsg}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
            </svg>
            <span style={{ color: "#4b5563", fontSize: "14px", marginTop: "8px" }}>
              {REGION_NAME} 표시할 매물이 없습니다
            </span>
          </div>
        )}

        {/* FLOATING FILTER CHIPS */}
        <div className={s.floatFilters}>
          {CHIP_LABELS.map((label) => (
            <button
              key={label}
              className={`${s.fChip} ${activeChip === label ? s.active : ""}`}
              onClick={() => setActiveChip(label)}
            >
              {label}
              {label === "아파트" && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* BOTTOM SHEET */}
        <div className={`${s.bottomSheet} ${sheetExpanded ? s.expanded : ""}`}>
          <div className={s.bsHandleArea} onClick={toggleSheet}>
            <div className={s.bsHandle}></div>
            <p className={s.bsCount}>총 <strong>{items.length}개</strong> 매물</p>
          </div>

          {items.length === 0 ? (
            <p style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>매물이 없습니다.</p>
          ) : !sheetExpanded ? (
            <div className={s.peekScroll}>
              {items.map((p) => renderCard(p, false))}
            </div>
          ) : (
            <div className={s.bsList}>
              <div className={s.bsListScroll}>
                {items.map((p) => renderCard(p, true))}
              </div>
            </div>
          )}
        </div>

        {/* DETAIL SHEET */}
        <div className={`${s.detailSheet} ${detailOpen ? s.open : ""}`}>
          <div className={s.dsHeader}>
            <div className={s.dsHeaderHandle}></div>
            <button className={s.dsClose} onClick={closeDetail}>✕</button>
          </div>
          {detailProp && (
            <div className={s.dsBody}>
              {/* Photo */}
              <div
                className={s.dsPhotoMain}
                style={
                  detailProp.photo
                    ? { backgroundImage: `url(${detailProp.photo})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { ...imgPlaceholderStyle, fontSize: 13, flexDirection: "column", gap: 6 }
                }
              >
                {!detailProp.photo && "등록된 사진이 없습니다"}
              </div>
              {/* Info */}
              <div className={s.dsInfo}>
                <div className={s.dsBadges}>
                  <span className={`${s.dsBadge} ${s.dsbSale}`} style={{ background: detailProp.isJeonse ? "#2e4bd8" : undefined }}>{detailProp.isJeonse ? "전세" : "매매"}</span>
                  {detailProp.isCertified && <span className={s.dsBadge} style={{ background: "#dcfce7", color: "#16a34a" }}>안심매물</span>}
                </div>
                <div className={s.dsPrice}>{fullWon(detailProp.amount)}</div>
                <div className={s.dsAddr}>{detailProp.region} {detailProp.dong} {detailProp.aptName}</div>
                <div className={s.dsMetaGrid}>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.area ?? "-"}㎡</strong>
                    전용면적
                  </div>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.floor ?? "-"}층</strong>
                    층수
                  </div>
                </div>
                <div className={s.dsDescLabel}>매물 설명</div>
                <p className={s.dsDesc}>
                  {detailProp.region} {detailProp.dong}에 위치한 {detailProp.aptName} {detailProp.roomType ?? "아파트"}입니다.
                  전용 {detailProp.area ?? "-"}㎡, {detailProp.floor ?? "-"}층, {detailProp.isJeonse ? "전세 보증금" : "매매가"} {fullWon(detailProp.amount)}.
                  {detailProp.isCertified ? " 등기·건축물대장·재산세 3종 서류가 확인된 안심인증 매물입니다." : ""}
                </p>
              </div>
            </div>
          )}
          <div className={s.dsCta}>
            <Link href={detailProp ? detailHref(detailProp) : "/renewal/listings-list"} className={`${s.ctaBtn} ${s.ctaSecondary}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              상세보기
            </Link>
            <button className={`${s.ctaBtn} ${s.ctaPrimary}`}>계약의향서 받아보기</button>
          </div>
        </div>

      </div>
    </div>
  );
}
