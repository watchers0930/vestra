"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import s from "./listings-map-mobile.module.css";

/* ── Data ── */
interface Property {
  lat: number;
  lng: number;
  label: string;
  badges: string[];
  price: string;
  priceNote: string;
  addr: string;
  area: string;
  floor: string;
  trust: boolean;
  desc: string;
  agency: string;
  photos: string[];
}

const PROPS: Property[] = [
  {
    lat: 37.4946, lng: 127.0614,
    label: "13억5000만",
    badges: ["매매", "전세"],
    price: "13억 5,000만원",
    priceNote: "(대지면적 기준)",
    addr: "서울시 강남구 대치동 966 대치아이파크",
    area: "84.9㎡", floor: "12/25층",
    trust: true,
    desc: "강남구 대치동 하이엔드 아파트단지입니다. 남향 배치와 채광이 우수하며 인근 초등학교 도보 5분 이내입니다. 전용 84.9㎡, 고층 남향 세대로 한강 조망 가능합니다.",
    agency: "서울공인중개사",
    photos: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80",
    ],
  },
  {
    lat: 37.5499, lng: 126.9145,
    label: "2억8000만",
    badges: ["전세"],
    price: "2억 8,000만원",
    priceNote: "(24개월)",
    addr: "서울시 마포구 합정동 402-5",
    area: "59.4㎡", floor: "3/5층",
    trust: true,
    desc: "합정역 도보 4분 역세권 빌라입니다. 풀옵션 인테리어 시공 완료, 즉시 입주 가능하며 주변 카페거리와 인접해 생활 편의성이 높습니다.",
    agency: "마포공인중개사",
    photos: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&auto=format&fit=crop&q=80",
    ],
  },
];

const CHIP_LABELS = ["전체", "매매", "전세", "단기임대", "아파트", "빌라", "안심인증"];

/* ── Component ── */
export default function ListingsMapMobileClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("전체");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProp, setDetailProp] = useState<Property | null>(null);
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);

  function openDetail(p: Property) {
    setDetailProp(p);
    setActiveThumbIdx(0);
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

  function changePhoto(idx: number) {
    setActiveThumbIdx(idx);
  }

  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Paperlogy','Apple SD Gothic Neo','Noto Sans KR',-apple-system,sans-serif", color: "#1a1d2e", WebkitFontSmoothing: "antialiased" }}>

      {/* NAV */}
      <nav className={s.nav}>
        <a href="#" className={s.navLogo}>
          <div className={s.navLogoIcon}>V</div>
          <span className={s.navLogoText}>VESTRA</span>
        </a>
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
          <li><a href="#">시세전망</a></li>
          <li><a href="#">전문가상담</a></li>
        </ul>
      </nav>

      {/* MAP AREA */}
      <div className={s.mapArea}>

        {/* MAP PLACEHOLDER (replaces Kakao map) */}
        <div className={s.mapPlaceholder}>
          <div className={s.mapPlaceholderInner}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
            </svg>
            <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>지도 영역</span>
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
            <p className={s.bsCount}>총 <strong>2개</strong> 매물</p>
          </div>

          {/* PEEK MODE: horizontal scroll */}
          {!sheetExpanded && (
            <div className={s.peekScroll}>
              {PROPS.map((p, idx) => (
                <div
                  key={idx}
                  className={s.peekCard}
                  onClick={() => openDetail(p)}
                >
                  <div
                    className={s.peekCardImg}
                    style={{ backgroundImage: `url(${p.photos[0]})` }}
                  />
                  <div className={s.peekCardBody}>
                    <div className={s.peekBadges}>
                      {p.badges.map((b) => (
                        <span
                          key={b}
                          className={`${s.peekBadge} ${b === "매매" ? s.pbSale : s.pbJeonse}`}
                        >
                          {b}
                        </span>
                      ))}
                      {p.trust && (
                        <span className={`${s.peekBadge} ${s.pbTrust}`}>안심인증</span>
                      )}
                    </div>
                    <div className={s.peekPrice}>{p.price}</div>
                    <div className={s.peekAddr}>{p.addr}</div>
                    <div className={s.peekMeta}>{p.area} · {p.floor}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EXPANDED MODE: vertical list */}
          {sheetExpanded && (
            <div className={s.bsList}>
              <div className={s.bsListScroll}>
                {PROPS.map((p, idx) => (
                  <div
                    key={idx}
                    className={s.peekCard}
                    style={{ width: "100%", flexShrink: 1 }}
                    onClick={() => openDetail(p)}
                  >
                    <div
                      className={s.peekCardImg}
                      style={{ backgroundImage: `url(${p.photos[0]})`, width: "120px", height: "90px" }}
                    />
                    <div className={s.peekCardBody}>
                      <div className={s.peekBadges}>
                        {p.badges.map((b) => (
                          <span
                            key={b}
                            className={`${s.peekBadge} ${b === "매매" ? s.pbSale : s.pbJeonse}`}
                          >
                            {b}
                          </span>
                        ))}
                        {p.trust && (
                          <span className={`${s.peekBadge} ${s.pbTrust}`}>안심인증</span>
                        )}
                      </div>
                      <div className={s.peekPrice}>{p.price}</div>
                      <div className={s.peekAddr}>{p.addr}</div>
                      <div className={s.peekMeta}>{p.area} · {p.floor}</div>
                    </div>
                  </div>
                ))}
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
              {/* Photo gallery */}
              <div
                className={s.dsPhotoMain}
                style={{ backgroundImage: `url(${detailProp.photos[activeThumbIdx]})` }}
              />
              <div className={s.dsThumbs}>
                {detailProp.photos.map((src, i) => (
                  <div
                    key={i}
                    className={`${s.dsThumb} ${activeThumbIdx === i ? s.active : ""}`}
                    style={{ backgroundImage: `url(${src})` }}
                    onClick={() => changePhoto(i)}
                  />
                ))}
              </div>
              {/* Info */}
              <div className={s.dsInfo}>
                <div className={s.dsBadges}>
                  {detailProp.badges.map((b) => (
                    <span
                      key={b}
                      className={`${s.dsBadge} ${b === "매매" ? s.dsbSale : s.dsbJeonse}`}
                    >
                      {b}
                    </span>
                  ))}
                  {detailProp.trust && (
                    <span className={s.dsTrustTag}>VESTRA 안심인증</span>
                  )}
                </div>
                <div className={s.dsPrice}>{detailProp.price}</div>
                <div className={s.dsPriceNote}>{detailProp.priceNote}</div>
                <div className={s.dsAddr}>{detailProp.addr}</div>
                <div className={s.dsMetaGrid}>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.area}</strong>
                    전용면적
                  </div>
                  <div className={s.dsMetaItem}>
                    <strong>{detailProp.floor}</strong>
                    층수
                  </div>
                </div>
                <div className={s.dsDescLabel}>매물 설명</div>
                <p className={s.dsDesc}>{detailProp.desc}</p>
                <p className={s.dsAgency}>
                  연락처 | <a href="#">{detailProp.agency}</a>
                </p>
              </div>
            </div>
          )}
          <div className={s.dsCta}>
            <Link href="/renewal/listing-detail" className={`${s.ctaBtn} ${s.ctaSecondary}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              상세보기
            </Link>
            <button className={`${s.ctaBtn} ${s.ctaPrimary}`}>계약의향서 받아보기</button>
          </div>
        </div>

      </div>
    </div>
  );
}
