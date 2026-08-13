"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import s from "./listings-map.module.css";

const PROPS = [
  {
    lat: 37.4946,
    lng: 127.0614,
    label: "13억5000만",
    badges: ["매매", "전세"],
    price: "13억 5,000만원",
    priceNote: "(대지면적 기준)",
    addr: "서울시 강남구 대치동 966 대치아이파크",
    area: "84.9㎡",
    floor: "12/25층",
    trust: true,
    desc: "강남구 대치동 하이엔드 아파트단지입니다. 남향 배치와 채광이 우수하며 인근 초등학교 도보 5분 이내입니다. 전용 84.9㎡, 고층 남향 세대로 한강 조망 가능합니다.",
    agency: "서울공인중개사",
    mainPhoto:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80",
    sub1: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=200&auto=format&fit=crop&q=80",
    sub2: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&auto=format&fit=crop&q=80",
  },
  {
    lat: 37.5499,
    lng: 126.9145,
    label: "2억8000만",
    badges: ["전세"],
    price: "2억 8,000만원",
    priceNote: "(24개월)",
    addr: "서울시 마포구 합정동 402-5",
    area: "59.4㎡",
    floor: "3/5층",
    trust: true,
    desc: "합정역 도보 4분 역세권 빌라입니다. 풀옵션 인테리어 시공 완료, 즉시 입주 가능하며 주변 카페거리와 인접해 생활 편의성이 높습니다.",
    agency: "마포공인중개사",
    mainPhoto:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop&q=80",
    sub1: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&auto=format&fit=crop&q=80",
    sub2: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=200&auto=format&fit=crop&q=80",
  },
];

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

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [detailData, setDetailData] = useState(PROPS[0]);

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
    setDetailData(PROPS[idx]);
    setActiveItem(idx);
    setDetailOpen(true);
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
          <Link href="/home" className={s.navLogo}>
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
            <Link href="/register">회원가입</Link>
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
              <Link href="/register">회원가입</Link>
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
              <span className={s.listGroupTitle}>대치2동</span>
              <span className={s.listGroupCount}>1건</span>
            </div>

            <div
              className={`${s.listItem} ${activeItem === 0 ? s.active : ""}`}
              onClick={() => openDetail(0)}
            >
              <div className={s.listThumb}></div>
              <div className={s.listInfo}>
                <div className={s.listBadges}>
                  <span className={`${s.listBadge} ${s.lbSale}`}>매매</span>
                  <span className={`${s.listBadge} ${s.lbJeonse}`}>전세</span>
                </div>
                <div className={s.listPrice}>13억 5,000만</div>
                <div className={s.listAddr}>
                  서울시 강남구 대치동 966 대치아이파크
                </div>
                <span className={s.listTrustBadge}>안심인증</span>
              </div>
            </div>

            <div
              className={`${s.listItem} ${activeItem === 1 ? s.active : ""}`}
              onClick={() => openDetail(1)}
            >
              <div
                className={s.listThumb}
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=200&auto=format&fit=crop&q=80')",
                }}
              ></div>
              <div className={s.listInfo}>
                <div className={s.listBadges}>
                  <span className={`${s.listBadge} ${s.lbJeonse}`}>전세</span>
                </div>
                <div className={s.listPrice}>2억 8,000만</div>
                <div className={s.listAddr}>서울시 마포구 합정동 402-5</div>
                <span className={s.listTrustBadge}>안심인증</span>
              </div>
            </div>
          </div>

          {/* CENTER: MAP PLACEHOLDER */}
          <div className={s.mapCenter}>
            <div className={s.mapPlaceholder}>
              <div className={s.mapPlaceholderInner}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    fill="#2e4bd8"
                    opacity="0.5"
                  />
                </svg>
                <span
                  style={{
                    color: "#888",
                    fontSize: "14px",
                    marginTop: "8px",
                  }}
                >
                  지도 영역
                </span>
              </div>
            </div>

            {/* Map controls */}
            <div className={s.mapControls}>
              <button className={s.mapCtrlBtn}>+</button>
              <button className={s.mapCtrlBtn}>−</button>
            </div>
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
                  VESTRA 안심인증 매물
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
              <button className={s.detailCtaBtn}>
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
