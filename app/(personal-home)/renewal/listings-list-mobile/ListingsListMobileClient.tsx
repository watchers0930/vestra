"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import s from "./listings-list-mobile.module.css";
import { useListings, type ListingType } from "@/app/(app)/listings/hooks/useListings";
import { GANGNAM_TEST_LISTINGS } from "../listings-list/test-fixtures";
import MobileListingCard from "./components/MobileListingCard";

const REGIONS: Record<string, string[]> = {
  "서울특별시": ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  "부산광역시": ["강서구","금정구","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"],
  "대구광역시": ["남구","달서구","달성군","동구","북구","서구","수성구","중구"],
  "인천광역시": ["강화군","계양구","남동구","동구","미추홀구","부평구","서구","연수구","중구"],
  "광주광역시": ["광산구","남구","동구","북구","서구"],
  "대전광역시": ["대덕구","동구","서구","유성구","중구"],
  "울산광역시": ["남구","동구","북구","울주군","중구"],
  "세종특별자치시": ["세종시"],
  "경기도": ["가평군","고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","동두천시","부천시","성남시","수원시","시흥시","안산시","안성시","안양시","양주시","양평군","여주시","연천군","오산시","용인시","의왕시","의정부시","이천시","파주시","평택시","포천시","하남시","화성시"],
  "강원도": ["강릉시","고성군","동해시","삼척시","속초시","양구군","양양군","영월군","원주시","인제군","정선군","철원군","춘천시","태백시","평창군","홍천군","화천군","횡성군"],
  "충청북도": ["괴산군","단양군","보은군","영동군","옥천군","음성군","제천시","증평군","진천군","청주시","충주시"],
  "충청남도": ["계룡시","공주시","금산군","논산시","당진시","보령시","부여군","서산시","서천군","아산시","예산군","천안시","청양군","태안군","홍성군"],
  "전라북도": ["고창군","군산시","김제시","남원시","무주군","부안군","순창군","완주군","익산시","임실군","장수군","전주시","정읍시","진안군"],
  "전라남도": ["강진군","고흥군","곡성군","광양시","구례군","나주시","담양군","목포시","무안군","보성군","순천시","신안군","여수시","영광군","영암군","완도군","장성군","장흥군","진도군","함평군","해남군","화순군"],
  "경상북도": ["경산시","경주시","고령군","구미시","군위군","김천시","문경시","봉화군","상주시","성주군","안동시","영덕군","영양군","영주시","영천시","예천군","울릉군","울진군","의성군","청도군","청송군","칠곡군","포항시"],
  "경상남도": ["거제시","거창군","고성군","김해시","남해군","밀양시","사천시","산청군","양산시","의령군","진주시","창녕군","창원시","통영시","하동군","함안군","함양군","합천군"],
  "제주특별자치도": ["서귀포시","제주시"],
};

const BUILDING_TYPES = ["아파트", "단독", "다가구", "연립", "빌라"];

const SIZE_RANGES: Record<string, { min?: number; max?: number }> = {
  "10평형": { max: 49 },
  "20평형": { min: 49, max: 82 },
  "30평형": { min: 82, max: 115 },
  "40평형": { min: 115, max: 148 },
  "50평형 이상": { min: 181 },
};

type DropdownKey = "type" | "trade" | "size" | null;

interface FilterState {
  type: string;
  trade: string;
  size: string;
}

const DEFAULT_LABELS: FilterState = {
  type: "건물유형",
  trade: "거래유형",
  size: "전체 평형",
};

const emptyMsgStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  textAlign: "center",
  padding: "48px 0",
  color: "#999",
  fontSize: "14px",
};

export default function ListingsListMobileClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [filterLabels, setFilterLabels] = useState<FilterState>({ ...DEFAULT_LABELS });
  const [sido, setSido] = useState("서울특별시");
  const [sigungu, setSigungu] = useState("");

  // 테스트 샘플 매물: 운영(vestra-plum) 도메인에서는 노출하지 않음.
  // 실데이터가 비어있을 때만 테스트 화면 확인용 샘플 카드를 보여준다. (PC 목록과 동일)
  const [showFixtures, setShowFixtures] = useState(false);
  useEffect(() => {
    // 클라이언트 전용 도메인 판별 — SSR(false) 후 클라이언트에서 갱신해 하이드레이션 불일치 방지
    const host = window.location.hostname;
    const isProd = host === "vestra-plum.vercel.app";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowFixtures(!isProd);
  }, []);

  const sigunguList = REGIONS[sido] || [];

  // ── 필터값 → useListings 파라미터 (PC listings-list와 동일 매핑) ──
  const listingType: ListingType | undefined =
    filterLabels.trade === "전세" ? "JEONSE" :
    filterLabels.trade === "매매" ? "SALE" :
    undefined;
  const roomType = BUILDING_TYPES.includes(filterLabels.type) ? filterLabels.type : undefined;
  const sizeRange = SIZE_RANGES[filterLabels.size] ?? {};
  const region = sigungu || (sido ? sido.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "") : undefined);

  const { listings, loading } = useListings(listingType, {
    roomType,
    region,
    minSize: sizeRange.min,
    maxSize: sizeRange.max,
  });

  // 실데이터 우선, 비어있고 비운영 도메인이면 샘플 카드로 폴백 (PC 목록과 동일 동작)
  const cards = listings.length > 0 ? listings : showFixtures ? GANGNAM_TEST_LISTINGS : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${s.filterDdWrap}`)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const toggleDd = (key: DropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const selectDd = (key: keyof FilterState, value: string) => {
    setFilterLabels((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const isActive = (key: keyof FilterState) => filterLabels[key] !== DEFAULT_LABELS[key];

  return (
    <>
      {/* NAV */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li><Link href="/renewal/listings-list">매물검색</Link></li>
          <li><Link href="/renewal/jeonse">전세보호</Link></li>
          <li><a href="/renewal/rights">권리분석</a></li>
          <li><Link href="/renewal/monitoring">등기감시</Link></li>
          <li><Link href="/renewal/contract">계약검토</Link></li>
          <li><Link href="/renewal/price-map">시세전망</Link></li>
          <li><Link href="/renewal/expert">전문가상담</Link></li>
          <li>
            <div className={s.navMobileAuth}>
              <Link href="/login">로그인</Link>
              <Link href="/profile">마이페이지</Link>
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
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      {/* LISTINGS */}
      <section className={s.subListings}>
        <h2 className={s.subSectionTitle}>베스트라 인증 안심전세 매물</h2>

        {/* FILTER ROW */}
        <div className={s.filterRow}>
          {/* 건물유형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.filterDdBtn} ${isActive("type") ? s.active : ""}`}
              onClick={() => toggleDd("type")}
            >
              <span>{filterLabels.type}</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="2,4 6,8 10,4" /></svg>
            </button>
            <div className={`${s.filterDdPanel} ${openDropdown === "type" ? s.open : ""}`}>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "건물유형" ? s.selected : ""}`} onClick={() => selectDd("type", "건물유형")}>건물유형 (전체)</button>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "아파트" ? s.selected : ""}`} onClick={() => selectDd("type", "아파트")}>아파트</button>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "단독" ? s.selected : ""}`} onClick={() => selectDd("type", "단독")}>단독</button>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "다가구" ? s.selected : ""}`} onClick={() => selectDd("type", "다가구")}>다가구</button>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "연립" ? s.selected : ""}`} onClick={() => selectDd("type", "연립")}>연립</button>
              <button className={`${s.filterDdOpt} ${filterLabels.type === "빌라" ? s.selected : ""}`} onClick={() => selectDd("type", "빌라")}>빌라</button>
            </div>
          </div>
          {/* 거래유형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.filterDdBtn} ${isActive("trade") ? s.active : ""}`}
              onClick={() => toggleDd("trade")}
            >
              <span>{filterLabels.trade}</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="2,4 6,8 10,4" /></svg>
            </button>
            <div className={`${s.filterDdPanel} ${openDropdown === "trade" ? s.open : ""}`}>
              <button className={`${s.filterDdOpt} ${filterLabels.trade === "거래유형" ? s.selected : ""}`} onClick={() => selectDd("trade", "거래유형")}>거래유형 (전체)</button>
              <button className={`${s.filterDdOpt} ${filterLabels.trade === "매매" ? s.selected : ""}`} onClick={() => selectDd("trade", "매매")}>매매</button>
              <button className={`${s.filterDdOpt} ${filterLabels.trade === "전세" ? s.selected : ""}`} onClick={() => selectDd("trade", "전세")}>전세</button>
              <button className={`${s.filterDdOpt} ${filterLabels.trade === "단기임대" ? s.selected : ""}`} onClick={() => selectDd("trade", "단기임대")}>단기임대</button>
              <button className={`${s.filterDdOpt} ${filterLabels.trade === "초단기임대" ? s.selected : ""}`} onClick={() => selectDd("trade", "초단기임대")}>초단기임대</button>
            </div>
          </div>
          {/* 전체 평형 */}
          <div className={s.filterDdWrap}>
            <button
              className={`${s.filterDdBtn} ${isActive("size") ? s.active : ""}`}
              onClick={() => toggleDd("size")}
            >
              <span>{filterLabels.size}</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="2,4 6,8 10,4" /></svg>
            </button>
            <div className={`${s.filterDdPanel} ${openDropdown === "size" ? s.open : ""}`}>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "전체 평형" ? s.selected : ""}`} onClick={() => selectDd("size", "전체 평형")}>전체 평형</button>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "10평형" ? s.selected : ""}`} onClick={() => selectDd("size", "10평형")}>10평형</button>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "20평형" ? s.selected : ""}`} onClick={() => selectDd("size", "20평형")}>20평형</button>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "30평형" ? s.selected : ""}`} onClick={() => selectDd("size", "30평형")}>30평형</button>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "40평형" ? s.selected : ""}`} onClick={() => selectDd("size", "40평형")}>40평형</button>
              <button className={`${s.filterDdOpt} ${filterLabels.size === "50평형 이상" ? s.selected : ""}`} onClick={() => selectDd("size", "50평형 이상")}>50평형 이상</button>
            </div>
          </div>
          <div className={s.filterSep}></div>
          <select
            className={s.locationSelect}
            value={sido}
            onChange={(e) => { setSido(e.target.value); setSigungu(""); }}
          >
            <option value="">시 / 도</option>
            <option value="서울특별시">서울특별시</option>
            <option value="부산광역시">부산광역시</option>
            <option value="대구광역시">대구광역시</option>
            <option value="인천광역시">인천광역시</option>
            <option value="광주광역시">광주광역시</option>
            <option value="대전광역시">대전광역시</option>
            <option value="울산광역시">울산광역시</option>
            <option value="세종특별자치시">세종특별자치시</option>
            <option value="경기도">경기도</option>
            <option value="강원도">강원도</option>
            <option value="충청북도">충청북도</option>
            <option value="충청남도">충청남도</option>
            <option value="전라북도">전라북도</option>
            <option value="전라남도">전라남도</option>
            <option value="경상북도">경상북도</option>
            <option value="경상남도">경상남도</option>
            <option value="제주특별자치도">제주특별자치도</option>
          </select>
          <select
            className={s.locationSelect}
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
          >
            <option value="">시 / 군 / 구</option>
            {sigunguList.map((sg) => (
              <option key={sg} value={sg}>{sg}</option>
            ))}
          </select>
        </div>

        {/* RESULTS BAR */}
        <div className={s.resultsHeader}>
          <p className={s.resultsCount}>총 <strong>{cards.length}개</strong> 매물</p>
          <div className={s.resultsRight}>
            <button className={s.sortBtn}>
              최신순
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="2,4 6,8 10,4" /></svg>
            </button>
            <div className={s.viewToggle}>
              <button className={`${s.viewBtn} ${s.active}`} title="목록보기">
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.1"><line x1="1" y1="3" x2="14" y2="3" /><line x1="1" y1="7.5" x2="14" y2="7.5" /><line x1="1" y1="12" x2="14" y2="12" /></svg>
              </button>
              <Link href="/renewal/listings-map" className={s.viewBtn} title="지도보기">
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z" /><circle cx="7.5" cy="5" r="1.4" /></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* CARD GRID */}
        <div className={s.subListingsGrid}>
          {loading ? (
            <p style={emptyMsgStyle}>매물을 불러오는 중…</p>
          ) : cards.length === 0 ? (
            <p style={emptyMsgStyle}>조건에 맞는 매물이 없습니다.</p>
          ) : (
            cards.map((l, i) => <MobileListingCard key={l.id} listing={l} index={i} />)
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerLogoRow}>
          <div className={s.flogoIcon}>V</div>
          <span className={s.flogoText}>VESTRA</span>
        </div>
        <p className={s.footerTagline}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
        <div className={s.footerContact}>
          BMI C&amp;S | 대표이사 김동의<br />
          사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
          서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
          고객센터 010-8490-9271
        </div>
        <div className={s.footerLinksRow}>
          <div className={s.footerCol}>
            <p className={s.footerColTitle}>Legal</p>
            <ul className={s.footerLinks}>
              <li><a href="#">개인정보처리방침</a></li>
              <li><a href="#">이용약관</a></li>
            </ul>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerColTitle}>Product</p>
            <ul className={s.footerLinks}>
              <li><a href="#">기능 소개</a></li>
              <li><a href="#">요금제</a></li>
            </ul>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerColTitle}>Company</p>
            <ul className={s.footerLinks}>
              <li><a href="#">회사 소개</a></li>
              <li><a href="#">채용</a></li>
            </ul>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerColTitle}>Connect</p>
            <ul className={s.footerLinks}>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>© 2026 BMI-C&amp;S All rights reserved.</div>
      </footer>
    </>
  );
}
