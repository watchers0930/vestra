"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import s from "./listings-map-mobile.module.css";

/* ── 국토교통부 실거래 아파트 ── */
interface AptItem {
  id: string;
  aptName: string;
  dong: string;
  jibun: string | null;
  area: number;
  floor: number;
  buildYear: number;
  dealAmount: number;
  dealDate: string;
  lat?: number;
  lng?: number;
}

const REGION_NAME = "강남구";
const CHIP_LABELS = ["전체", "매매", "전세", "단기임대", "아파트", "빌라", "안심인증"];

/** 원 단위 → "13억 5,000만원" */
function fullWon(won: number): string {
  const eok = Math.floor(won / 1e8);
  const man = Math.floor((won % 1e8) / 1e4);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

function detailHref(p: AptItem): string {
  const q = new URLSearchParams({
    region: REGION_NAME,
    dong: p.dong,
    apt: p.aptName,
    area: String(p.area),
    floor: String(p.floor),
    amount: String(p.dealAmount),
    dealDate: p.dealDate,
    buildYear: String(p.buildYear),
  });
  if (p.lat != null && p.lng != null) {
    q.set("lat", String(p.lat));
    q.set("lng", String(p.lng));
  }
  return `/renewal/listing-detail?${q.toString()}`;
}

const imgPlaceholderStyle: React.CSSProperties = {
  background: "#e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontSize: 11,
};

/* ── Component ── */
export default function ListingsMapMobileClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("전체");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProp, setDetailProp] = useState<AptItem | null>(null);
  const [items, setItems] = useState<AptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/listings/apartments?region=${encodeURIComponent(REGION_NAME)}&limit=30&geocode=1`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function openDetail(p: AptItem) {
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

  function renderCard(p: AptItem, expanded: boolean) {
    return (
      <div
        key={p.id}
        className={s.peekCard}
        style={expanded ? { width: "100%", flexShrink: 1 } : undefined}
        onClick={() => openDetail(p)}
      >
        <div
          className={s.peekCardImg}
          style={expanded ? { ...imgPlaceholderStyle, width: "120px", height: "90px" } : imgPlaceholderStyle}
        >
          사진 없음
        </div>
        <div className={s.peekCardBody}>
          <div className={s.peekBadges}>
            <span className={`${s.peekBadge} ${s.pbSale}`}>매매</span>
          </div>
          <div className={s.peekPrice}>{fullWon(p.dealAmount)}</div>
          <div className={s.peekAddr}>{REGION_NAME} {p.dong} {p.aptName}</div>
          <div className={s.peekMeta}>{p.area}㎡ · {p.floor}층 · {p.buildYear}년</div>
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

        {/* MAP PLACEHOLDER */}
        <div className={s.mapPlaceholder}>
          <div className={s.mapPlaceholderInner}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
            </svg>
            <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>{REGION_NAME} 실거래 {items.length}건</span>
          </div>
        </div>

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

          {loading ? (
            <p style={{ textAlign: "center", padding: "24px 0", color: "#999", fontSize: 13 }}>불러오는 중…</p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: "center", padding: "24px 0", color: "#999", fontSize: 13 }}>실거래 매물이 없습니다.</p>
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
              {/* Photo placeholder */}
              <div className={s.dsPhotoMain} style={{ ...imgPlaceholderStyle, fontSize: 13, flexDirection: "column", gap: 6 }}>
                등록된 사진이 없습니다
                <span style={{ fontSize: 11 }}>국토교통부 실거래 기반 매물</span>
              </div>
              {/* Info */}
              <div className={s.dsInfo}>
                <div className={s.dsBadges}>
                  <span className={`${s.dsBadge} ${s.dsbSale}`}>매매</span>
                </div>
                <div className={s.dsPrice}>{fullWon(detailProp.dealAmount)}</div>
                <div className={s.dsPriceNote}>{detailProp.dealDate} 실거래</div>
                <div className={s.dsAddr}>{REGION_NAME} {detailProp.dong} {detailProp.aptName}</div>
                <div className={s.dsMetaGrid}>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.area}㎡</strong>
                    전용면적
                  </div>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.floor}층</strong>
                    층수
                  </div>
                </div>
                <div className={s.dsDescLabel}>매물 설명</div>
                <p className={s.dsDesc}>
                  {REGION_NAME} {detailProp.dong} {detailProp.aptName} 단지의 국토교통부 실거래 정보입니다.
                  전용 {detailProp.area}㎡, {detailProp.floor}층, {detailProp.buildYear}년 준공.
                  {detailProp.dealDate} 거래가 {fullWon(detailProp.dealAmount)}.
                </p>
                <p className={s.dsAgency}>
                  출처 | 국토교통부 실거래가
                </p>
              </div>
            </div>
          )}
          <div className={s.dsCta}>
            <Link href={detailProp ? detailHref(detailProp) : "/renewal/listing-detail"} className={`${s.ctaBtn} ${s.ctaSecondary}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              상세보기
            </Link>
            <button className={`${s.ctaBtn} ${s.ctaPrimary}`}>계약의향서 받아보기</button>
          </div>
        </div>

      </div>
    </div>
  );
}
