"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./listings-map.module.css";
import { KakaoMarkersMap, type MapMarker } from "@/app/(app)/listings/components/KakaoMarkersMap";

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400&auto=format&fit=crop&q=80",
];

interface Apt {
  aptName: string; dong: string; area: number; floor: number;
  buildYear: number; dealAmount: number; dealDate: string; lat?: number; lng?: number;
}

function formatEok(won: number): string {
  if (!won) return "-";
  if (won >= 100_000_000) { const v = (won / 100_000_000).toFixed(1); return `${v.endsWith(".0") ? v.slice(0, -2) : v}억`; }
  if (won >= 10_000) return `${Math.floor(won / 10_000)}만`;
  return `${won.toLocaleString()}원`;
}
function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

type FilterKey = "type" | "trade" | "size";

const FILTER_DEFAULTS: Record<FilterKey, string> = {
  type: "건물유형",
  trade: "거래유형",
  size: "전체 평형",
};

const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  type: ["건물유형 (전체)", "아파트", "단독", "다가구", "연립", "빌라"],
  trade: ["거래유형 (전체)", "매매", "전세", "단기임대", "초단기임대"],
  size: [
    "전체 평형",
    "10평형",
    "20평형",
    "30평형",
    "40평형",
    "50평형",
    "50평형 이상",
  ],
};

export default function ListingsMapClient() {
  // Nav hamburger
  const [menuOpen, setMenuOpen] = useState(false);

  // Dropdown filter
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [filterLabels, setFilterLabels] = useState<Record<FilterKey, string>>({
    type: "건물유형",
    trade: "거래유형",
    size: "전체 평형",
  });
  const [filterActive, setFilterActive] = useState<Record<FilterKey, boolean>>({
    type: false,
    trade: false,
    size: false,
  });
  const [selectedOpts, setSelectedOpts] = useState<Record<FilterKey, string>>({
    type: "건물유형 (전체)",
    trade: "거래유형 (전체)",
    size: "전체 평형",
  });

  // Location selects
  const [sido, setSido] = useState("서울특별시");
  const [sigunguList, setSigunguList] = useState([
    "강남구",
    "서초구",
    "송파구",
    "강동구",
  ]);
  const [sigungu, setSigungu] = useState("강남구");

  const router = useRouter();
  const searchParams = useSearchParams();
  const region = sigungu || "강남구";
  const focusApt = searchParams.get("apt");

  // 진입 쿼리(region)로 시군구 초기화 (이후 select로 변경 가능)
  const regionInitRef = useRef(false);
  useEffect(() => {
    if (regionInitRef.current) return;
    regionInitRef.current = true;
    const r = searchParams.get("region");
    if (r && r !== sigungu) setSigungu(r);
  }, [searchParams, sigungu]);

  // 지역 아파트 실거래 (지오코딩 포함)
  const [items, setItems] = useState<Apt[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const loadItems = useCallback(async (regionName: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/listings/apartments?region=${encodeURIComponent(regionName)}&limit=60&geocode=1`);
      const data = res.ok ? await res.json() : { items: [] };
      setItems(data.items ?? []);
    } catch { setItems([]); }
    finally { setLoadingItems(false); }
  }, []);
  useEffect(() => { loadItems(region); }, [region, loadItems]);

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const toDisplay = (a: Apt, i: number) => ({
    lat: a.lat, lng: a.lng,
    badges: ["매매"],
    price: formatKoreanWon(a.dealAmount),
    priceNote: `${a.dealDate} 실거래`,
    addr: `${region} ${a.dong} ${a.aptName}`,
    area: `${a.area}㎡`,
    floor: `${a.floor}층`,
    buildYear: a.buildYear,
    desc: `${region} ${a.dong} ${a.aptName} 단지의 국토교통부 실거래 기록입니다. 전용 ${a.area}㎡, ${a.floor}층, ${a.dealDate} 거래가 ${formatKoreanWon(a.dealAmount)}입니다. 주변 인프라·학군·시세는 상세 페이지에서 확인하세요.`,
    agency: "국토부 실거래",
    mainPhoto: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length],
    sub1: SAMPLE_PHOTOS[(i + 1) % SAMPLE_PHOTOS.length],
    sub2: SAMPLE_PHOTOS[(i + 2) % SAMPLE_PHOTOS.length],
  });

  const EMPTY_DETAIL = {
    lat: undefined as number | undefined, lng: undefined as number | undefined,
    badges: [] as string[], price: "", priceNote: "", addr: "", area: "", floor: "",
    buildYear: 0, desc: "", agency: "", mainPhoto: "", sub1: "", sub2: "",
  };
  const detailData = activeItem != null && items[activeItem]
    ? toDisplay(items[activeItem], activeItem)
    : EMPTY_DETAIL;

  // 마커
  const markers = useMemo<MapMarker[]>(
    () => items
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({ id: String(items.indexOf(a)), lat: a.lat!, lng: a.lng!, label: formatEok(a.dealAmount) })),
    [items],
  );
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);

  // focus 파라미터로 진입 시 해당 물건 상세 자동 오픈
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || !focusApt || items.length === 0) return;
    const idx = items.findIndex((a) => a.aptName === focusApt);
    if (idx >= 0) {
      autoOpenedRef.current = true;
      setActiveItem(idx);
      setDetailOpen(true);
      if (items[idx].lat != null) setPanTo({ lat: items[idx].lat!, lng: items[idx].lng! });
    }
  }, [focusApt, items]);

  // Close dropdown when clicking outside
  const filterRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        filterRowRef.current &&
        !filterRowRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const toggleDropdown = (key: FilterKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const selectOption = (key: FilterKey, value: string) => {
    const isDefault =
      value === FILTER_DEFAULTS[key] ||
      value === `${FILTER_DEFAULTS[key]} (전체)`;
    setFilterLabels((prev) => ({ ...prev, [key]: value.replace(" (전체)", "") === FILTER_DEFAULTS[key] ? FILTER_DEFAULTS[key] : value }));
    setFilterActive((prev) => ({ ...prev, [key]: !isDefault }));
    setSelectedOpts((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const resetFilters = () => {
    setFilterLabels({ type: "건물유형", trade: "거래유형", size: "전체 평형" });
    setFilterActive({ type: false, trade: false, size: false });
    setSelectedOpts({
      type: "건물유형 (전체)",
      trade: "거래유형 (전체)",
      size: "전체 평형",
    });
    setOpenDropdown(null);
  };

  const updateSigungu = (value: string) => {
    setSido(value);
    const map: Record<string, string[]> = {
      서울특별시: ["강남구", "서초구", "송파구", "강동구", "마포구", "용산구", "성동구", "광진구"],
      경기도: ["수원시", "성남시", "고양시", "용인시", "안산시"],
    };
    const list = map[value] || [];
    setSigunguList(list);
    setSigungu(list[0] || "");
  };

  const openDetail = (idx: number) => {
    setActiveItem(idx);
    setDetailOpen(true);
    const a = items[idx];
    if (a?.lat != null) setPanTo({ lat: a.lat, lng: a.lng! });
  };

  // 상세 페이지로 이동 (계약의향서/상세보기)
  const goToDetail = () => {
    if (activeItem == null || !items[activeItem]) return;
    const a = items[activeItem];
    const q = new URLSearchParams({
      region, apt: a.aptName, dong: a.dong,
      area: String(a.area), floor: String(a.floor),
      amount: String(a.dealAmount), dealDate: a.dealDate,
      buildYear: String(a.buildYear),
    });
    if (a.lat != null) { q.set("lat", String(a.lat)); q.set("lng", String(a.lng)); }
    router.push(`/renewal/listing-detail?${q.toString()}`);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveItem(null);
  };

  const BADGE_CLASS: Record<string, string> = {
    매매: s.dbSale,
    전세: s.dbJeonse,
  };

  return (
    <>
      {/* NAV */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li>
              <Link href="/listings" className="active">
                매물검색
              </Link>
            </li>
            <li>
              <Link href="/jeonse">전세보호</Link>
            </li>
            <li>
              <Link href="/monitoring">관리분석</Link>
            </li>
            <li>
              <Link href="/monitoring">등기감시</Link>
            </li>
            <li>
              <Link href="/contract">계약검토</Link>
            </li>
            <li>
              <Link href="/prediction">시세전망</Link>
            </li>
            <li>
              <Link href="/expert-connect">전문가상담</Link>
            </li>
          </ul>
          <div className={s.navAuth}>
            <Link href="/login">로그인</Link>
            <span className={s.divider}>|</span>
            <Link href="/login">마이페이지</Link>
            <span className={s.divider}>|</span>
            <Link href="/signup">회원가입</Link>
          </div>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="메뉴"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li>
            <Link href="/listings">매물검색</Link>
          </li>
          <li>
            <Link href="/jeonse">전세보호</Link>
          </li>
          <li>
            <Link href="/monitoring">관리분석</Link>
          </li>
          <li>
            <Link href="/monitoring">등기감시</Link>
          </li>
          <li>
            <Link href="/contract">계약검토</Link>
          </li>
          <li>
            <Link href="/prediction">시세전망</Link>
          </li>
          <li>
            <Link href="/expert-connect">전문가상담</Link>
          </li>
          <li>
            <div className={s.navMobileAuth}>
              <Link href="/login">로그인</Link>
              <Link href="/login">마이페이지</Link>
              <Link href="/signup">회원가입</Link>
            </div>
          </li>
        </ul>
      </nav>

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
        <div className={s.mapFilterRow} ref={filterRowRef}>
          {/* 건물유형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.mapFilterBtn} ${filterActive.type ? s.active : ""}`}
              onClick={() => toggleDropdown("type")}
            >
              <span>{filterLabels.type}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>
            <div
              className={`${s.filterDdPanel} ${openDropdown === "type" ? s.open : ""}`}
            >
              {FILTER_OPTIONS.type.map((opt) => (
                <button
                  key={opt}
                  className={`${s.filterDdOpt} ${selectedOpts.type === opt ? s.selected : ""}`}
                  onClick={() => selectOption("type", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 거래유형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.mapFilterBtn} ${filterActive.trade ? s.active : ""}`}
              onClick={() => toggleDropdown("trade")}
            >
              <span>{filterLabels.trade}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>
            <div
              className={`${s.filterDdPanel} ${openDropdown === "trade" ? s.open : ""}`}
            >
              {FILTER_OPTIONS.trade.map((opt) => (
                <button
                  key={opt}
                  className={`${s.filterDdOpt} ${selectedOpts.trade === opt ? s.selected : ""}`}
                  onClick={() => selectOption("trade", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 평형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.mapFilterBtn} ${filterActive.size ? s.active : ""}`}
              onClick={() => toggleDropdown("size")}
            >
              <span>{filterLabels.size}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>
            <div
              className={`${s.filterDdPanel} ${openDropdown === "size" ? s.open : ""}`}
            >
              {FILTER_OPTIONS.size.map((opt) => (
                <button
                  key={opt}
                  className={`${s.filterDdOpt} ${selectedOpts.size === opt ? s.selected : ""}`}
                  onClick={() => selectOption("size", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              width: "1px",
              height: "20px",
              background: "#e8eaf0",
              margin: "0 4px",
            }}
          ></div>

          {/* 시/도 · 시/군/구 */}
          <select
            className={s.mapLocationSelect}
            value={sido}
            onChange={(e) => updateSigungu(e.target.value)}
          >
            <option value="">시 / 도</option>
            <option>서울특별시</option>
            <option>부산광역시</option>
            <option>대구광역시</option>
            <option>인천광역시</option>
            <option>광주광역시</option>
            <option>대전광역시</option>
            <option>경기도</option>
            <option>강원도</option>
          </select>
          <select
            className={s.mapLocationSelect}
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
          >
            <option value="">시 / 군 / 구</option>
            {sigunguList.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>

          <span className={s.filterSpacer}></span>
          <div className={s.viewToggle}>
            <Link
              href="/renewal/listings-list"
              className={s.viewBtn}
              title="목록보기"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <line x1="1" y1="3" x2="14" y2="3" />
                <line x1="1" y1="7.5" x2="14" y2="7.5" />
                <line x1="1" y1="12" x2="14" y2="12" />
              </svg>
            </Link>
            <button className={`${s.viewBtn} ${s.active}`} title="지도보기">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z" />
                <circle cx="7.5" cy="5" r="1.4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 3-PANEL */}
        <div className={s.mapPanels}>
          {/* LEFT: LIST PANEL */}
          <div className={s.mapListPanel}>
            <div className={s.listGroupHeader}>
              <span className={s.listGroupTitle}>{region}</span>
              <span className={s.listGroupCount}>{loadingItems ? "…" : `${items.length}건`}</span>
            </div>

            {/* 앱 ListingsMapView(ListingCardSmall) 스타일 카드 */}
            {items.map((a, idx) => (
              <button
                key={`${a.aptName}-${a.dealDate}-${idx}`}
                onClick={() => openDetail(idx)}
                style={{
                  width: "100%", display: "flex", gap: 12, padding: "12px 14px",
                  textAlign: "left", border: "none", borderBottom: "1px solid #eef0f4",
                  cursor: "pointer", background: activeItem === idx ? "#EFF5FF" : "#fff",
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0,
                  background: `#EEF1F8 url('${SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length]}') center/cover no-repeat`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "#fef3c7", color: "#b45309" }}>매매</span>
                    <span style={{ fontSize: 10, color: "#8e8e93" }}>아파트</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>{formatEok(a.dealAmount)}</p>
                  <p style={{ fontSize: 11, color: "#6e6e73", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "2px 0 0" }}>{region} {a.dong} {a.aptName}</p>
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 600, color: "#16a34a", background: "#dcfce7", padding: "1px 7px", borderRadius: 10 }}>국토부 실거래</span>
                </div>
              </button>
            ))}
            {!loadingItems && items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#aeaeb2", fontSize: 13 }}>매물이 없습니다</div>
            )}
          </div>

          {/* CENTER: MAP */}
          <div className={s.mapCenter}>
            <KakaoMarkersMap
              markers={markers}
              activeId={activeItem != null ? String(activeItem) : null}
              onMarkerClick={(id) => openDetail(Number(id))}
              panTo={panTo}
            />
          </div>

          {/* OVERLAY BACKDROP */}
          <div
            className={`${s.detailOverlay} ${detailOpen ? s.open : ""}`}
            onClick={closeDetail}
          ></div>

          {/* RIGHT: DETAIL PANEL */}
          <div
            className={`${s.mapDetailPanel} ${detailOpen ? s.open : ""}`}
          >
            <button
              className={s.detailCloseBtn}
              onClick={closeDetail}
              title="닫기"
            >
              ✕
            </button>

            {/* Photo grid */}
            <div className={s.detailPhotos}>
              <div
                className={s.detailMainPhoto}
                style={{ backgroundImage: `url(${detailData.mainPhoto})` }}
              ></div>
              <div
                className={s.detailSubPhoto1}
                style={{ backgroundImage: `url(${detailData.sub1})` }}
              ></div>
              <div
                className={s.detailSubPhoto2}
                style={{ backgroundImage: `url(${detailData.sub2})` }}
              ></div>
            </div>

            {/* Body */}
            <div className={s.detailBody}>
              {/* Address row */}
              <div className={s.detailAddrRow}>
                {detailData.badges.map((b) => (
                  <span
                    key={b}
                    className={`${s.detailBadge} ${BADGE_CLASS[b] || ""}`}
                  >
                    {b}
                  </span>
                ))}
                <span className={s.detailAddr}>{detailData.addr}</span>
              </div>

              {/* Price */}
              <div className={s.detailPriceSection}>
                <div className={s.detailPrice}>{detailData.price}</div>
                <div className={s.detailPriceNote}>{detailData.priceNote}</div>
              </div>

              {/* Meta */}
              <div className={s.detailMetaRow}>
                <span className={s.detailMetaItem}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#b0b4c0"
                    strokeWidth="1.3"
                  >
                    <rect x="1" y="1" width="10" height="10" rx="0.5" />
                    <line x1="4" y1="1" x2="4" y2="11" />
                  </svg>
                  {detailData.area}
                </span>
                <span className={s.detailMetaItem}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#b0b4c0"
                    strokeWidth="1.3"
                  >
                    <rect x="1.5" y="1.5" width="9" height="4" rx="0.5" />
                    <rect x="1.5" y="7" width="9" height="4" rx="0.5" />
                  </svg>
                  {detailData.floor}
                </span>
              </div>

              {/* Trust badge */}
              <div style={{ marginBottom: "14px" }}>
                <span className={s.detailTrustBadge}>
                  국토부 실거래 정보
                </span>
              </div>

              {/* Description */}
              <div className={s.detailDescLabel}>매물 설명</div>
              <p className={s.detailDesc}>{detailData.desc}</p>

              {/* Agency */}
              <div className={s.detailAgencyRow}>
                <span>
                  연락처 | <a href="#">{detailData.agency}</a>
                </span>
              </div>

              {/* CTA */}
              <button className={s.detailCtaBtn} onClick={goToDetail}>
                상세보기 · 계약의향서 받아보기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerLogo}>
              <div className={s.flogoIcon}>V</div>
              <span className={s.flogoText}>VESTRA</span>
            </div>
            <p className={s.footerTagline}>
              The Digital Curator of Real Estate
              <br />
              AI 기반 부동산 자산관리 플랫폼
            </p>
            <div className={s.footerContact}>
              BMI C&S | 대표이사 김동의
              <br />
              사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189
              <br />
              서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호
              <br />
              고객센터 010-8490-9271
            </div>
          </div>
          <div>
            <p className={s.footerColTitle}>Legal</p>
            <ul className={s.footerLinks}>
              <li>
                <a href="#">개인정보처리방침</a>
              </li>
              <li>
                <a href="#">이용약관</a>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Product</p>
            <ul className={s.footerLinks}>
              <li>
                <a href="#">기능 소개</a>
              </li>
              <li>
                <a href="#">요금제</a>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Company</p>
            <ul className={s.footerLinks}>
              <li>
                <a href="#">회사 소개</a>
              </li>
              <li>
                <a href="#">채용</a>
              </li>
              <li>
                <a href="#">뉴스레터</a>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Connect</p>
            <ul className={s.footerLinks}>
              <li>
                <a href="#">LinkedIn</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 BMI-C&S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>
    </>
  );
}
