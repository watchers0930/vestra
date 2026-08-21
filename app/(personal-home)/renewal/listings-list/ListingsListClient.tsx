"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import s from "./listings-list.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { useListings, type ListingType } from "@/app/(app)/listings/hooks/useListings";
import { ListingCard } from "@/app/(app)/listings/components/ListingCard";
import { GANGNAM_TEST_LISTINGS } from "./test-fixtures";

const REGIONS: Record<string, string[]> = {
  '서울특별시': ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
  '부산광역시': ['강서구','금정구','남구','동구','동래구','부산진구','북구','사상구','사하구','서구','수영구','연제구','영도구','중구','해운대구'],
  '대구광역시': ['남구','달서구','달성군','동구','북구','서구','수성구','중구'],
  '인천광역시': ['강화군','계양구','남동구','동구','미추홀구','부평구','서구','연수구','옹진군','중구'],
  '광주광역시': ['광산구','남구','동구','북구','서구'],
  '대전광역시': ['대덕구','동구','서구','유성구','중구'],
  '울산광역시': ['남구','동구','북구','울주군','중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['고양시','과천시','광명시','광주시','구리시','군포시','김포시','남양주시','부천시','성남시','수원시','시흥시','안산시','안성시','안양시','양주시','양평군','여주시','연천군','오산시','용인시','의왕시','의정부시','이천시','파주시','평택시','포천시','하남시','화성시'],
  '강원도': ['강릉시','고성군','동해시','삼척시','속초시','양구군','양양군','영월군','원주시','인제군','정선군','철원군','춘천시','태백시','평창군','홍천군','화천군','횡성군'],
  '충청북도': ['괴산군','단양군','보은군','영동군','옥천군','음성군','제천시','증평군','진천군','청주시','충주시'],
  '충청남도': ['계룡시','공주시','금산군','논산시','당진시','보령시','부여군','서산시','서천군','아산시','예산군','천안시','청양군','태안군','홍성군'],
  '전라북도': ['고창군','군산시','김제시','남원시','무주군','부안군','순창군','완주군','익산시','임실군','장수군','전주시','정읍시','진안군'],
  '전라남도': ['강진군','고흥군','곡성군','광양시','구례군','나주시','담양군','목포시','무안군','보성군','순천시','신안군','여수시','영광군','영암군','완도군','장성군','장흥군','진도군','함평군','해남군','화순군'],
  '경상북도': ['경산시','경주시','고령군','구미시','군위군','김천시','문경시','봉화군','상주시','성주군','안동시','영덕군','영양군','영주시','영천시','예천군','울릉군','울진군','의성군','청도군','청송군','칠곡군','포항시'],
  '경상남도': ['거제시','거창군','고성군','김해시','남해군','밀양시','사천시','산청군','양산시','의령군','진주시','창녕군','창원시','통영시','하동군','함안군','함양군','합천군'],
  '제주특별자치도': ['서귀포시','제주시'],
};

// 평형 라벨 → 전용면적(㎡) 범위 (1평 ≈ 3.3㎡)
const SIZE_RANGES: Record<string, { min?: number; max?: number }> = {
  '10평형': { max: 49 },
  '20평형': { min: 49, max: 82 },
  '30평형': { min: 82, max: 115 },
  '40평형': { min: 115, max: 148 },
  '50평형': { min: 148, max: 181 },
  '50평형 이상': { min: 181 },
};

const BUILDING_TYPES = ['아파트', '단독', '다가구', '연립', '빌라'];

const PIMG = ['pimg1', 'pimg2', 'pimg3', 'pimg4', 'pimg5', 'pimg6'] as const;

interface MolitApt {
  id: string;
  aptName: string;
  dong: string;
  area: number;
  floor: number;
  buildYear: number;
  dealAmount: number;
  dealDate: string;
}

// Fisher-Yates 셔플 (원본 불변)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MAX_CARDS = 9;

function formatEok(won: number): string {
  if (!won) return '-';
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    const s = eok.toFixed(1); // 천만 단위 반올림
    return `${s.endsWith('.0') ? s.slice(0, -2) : s}억`;
  }
  if (won >= 10_000) return `${Math.floor(won / 10_000)}만`;
  return `${won.toLocaleString()}원`;
}

type DropdownKey = 'type' | 'trade' | 'size' | null;

export default function ListingsListClient() {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const router = useRouter();
  const [dropdownLabels, setDropdownLabels] = useState({
    type: '아파트',
    trade: '매매',
    size: '전체 평형',
  });
  const [sido, setSido] = useState('서울특별시');
  const [sigungu, setSigungu] = useState('강남구');
  // 베스트라 안심인증매물만 보기 토글 (isCertified === true 만 노출)
  const [certifiedOnly, setCertifiedOnly] = useState(false);

  // 테스트 전용 샘플 매물: 운영(vestra-plum) 도메인에서는 절대 노출하지 않음.
  // 실데이터가 비어있을 때만 테스트 화면 확인용으로 강남 샘플 3건(1건 안심)을 보여준다.
  const [showFixtures, setShowFixtures] = useState(false);
  useEffect(() => {
    const host = window.location.hostname;
    const isProd = host === 'vestra-plum.vercel.app';
    setShowFixtures(!isProd);
  }, []);

  const sigunguList = sido && REGIONS[sido] ? REGIONS[sido] : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(`.${s.filterDdWrap}`)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── 필터값 도출 → API ──
  const listingType: ListingType | undefined =
    dropdownLabels.trade === '전세' ? 'JEONSE' :
    dropdownLabels.trade === '매매' ? 'SALE' :
    undefined;
  const roomType = BUILDING_TYPES.includes(dropdownLabels.type) ? dropdownLabels.type : undefined;
  const sizeRange = SIZE_RANGES[dropdownLabels.size] ?? {};
  // 시/군/구는 정확히, 시/도만 선택 시 접미사 제거해 주소 부분일치(예: '서울특별시'→'서울' ⊂ '서울시…')
  const region = sigungu
    || (sido ? sido.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '') : undefined);

  const { listings, loading } = useListings(listingType, {
    roomType,
    region,
    minSize: sizeRange.min,
    maxSize: sizeRange.max,
  });

  // ── 건물유형=아파트 → 국토교통부 실거래가 아파트 연동 ──
  // 안심인증만 보기가 켜지면 국토부 실거래(안심인증 대상 아님)는 제외하고 DB 인증매물만 노출
  const showMolit = dropdownLabels.type === '아파트' && !certifiedOnly;
  const molitRegion = sigungu || '강남구'; // 국토부는 시군구(법정동코드) 단위 조회
  const [molitItems, setMolitItems] = useState<MolitApt[]>([]);
  const [molitLoading, setMolitLoading] = useState(false);

  const loadMolit = useCallback(async (regionName: string) => {
    setMolitLoading(true);
    try {
      const res = await fetch(`/api/listings/apartments?region=${encodeURIComponent(regionName)}&limit=30`);
      const data = res.ok ? await res.json() : { items: [] };
      setMolitItems(data.items ?? []);
    } catch {
      setMolitItems([]);
    } finally {
      setMolitLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showMolit) loadMolit(molitRegion);
  }, [showMolit, molitRegion, loadMolit]);

  // 평형(면적) 필터 적용 → 랜덤 셔플 → 최대 9개
  const displayMolit = useMemo(() => {
    const filtered = molitItems.filter((m) => {
      if (sizeRange.min != null && m.area < sizeRange.min) return false;
      if (sizeRange.max != null && m.area > sizeRange.max) return false;
      return true;
    });
    return shuffle(filtered).slice(0, MAX_CARDS);
  }, [molitItems, sizeRange.min, sizeRange.max]);

  // DB 매물도 랜덤 셔플 → 최대 9개 (안심인증만 켜지면 isCertified 매물만)
  const displayListings = useMemo(() => {
    const base = certifiedOnly ? listings.filter((l) => l.isCertified) : listings;
    return shuffle(base).slice(0, MAX_CARDS);
  }, [listings, certifiedOnly]);

  // 테스트 샘플도 동일 필터 적용 (실데이터 없을 때 확인용)
  const displayFixtures = useMemo(
    () => (certifiedOnly ? GANGNAM_TEST_LISTINGS.filter((l) => l.isCertified) : GANGNAM_TEST_LISTINGS),
    [certifiedOnly],
  );

  const toggleDropdown = (key: DropdownKey) =>
    setOpenDropdown((prev) => (prev === key ? null : key));

  const selectDropdown = (key: 'type' | 'trade' | 'size', value: string) => {
    setDropdownLabels((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const isDefault = (key: 'type' | 'trade' | 'size', value: string) =>
    (key === 'type' && value === '건물유형') ||
    (key === 'trade' && value === '거래유형') ||
    (key === 'size' && value === '전체 평형');

  // 지도 페이지(01-1-1-2 구성)로 이동. 물건 선택 시 apt/dong으로 포커스 전달.
  const goToMap = (apt?: { aptName: string; dong: string }) => {
    const q = new URLSearchParams({ region: molitRegion });
    if (apt) { q.set('apt', apt.aptName); q.set('dong', apt.dong); }
    router.push(`/renewal/listings-map?${q.toString()}`);
  };

  const renderDropdown = (
    key: 'type' | 'trade' | 'size',
    defaultLabel: string,
    options: string[],
  ) => {
    const active = !isDefault(key, dropdownLabels[key]);
    return (
      <div className={s.filterDdWrap}>
        <button
          className={`${s.filterDdBtn} ${active ? s.active : ''}`}
          onClick={() => toggleDropdown(key)}
        >
          <span>{dropdownLabels[key]}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </button>
        <div className={`${s.filterDdPanel} ${openDropdown === key ? s.open : ''}`}>
          <button
            className={`${s.filterDdOpt} ${isDefault(key, dropdownLabels[key]) ? s.selected : ''}`}
            onClick={() => selectDropdown(key, defaultLabel)}
          >
            {defaultLabel} (전체)
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              className={`${s.filterDdOpt} ${dropdownLabels[key] === opt ? s.selected : ''}`}
              onClick={() => selectDropdown(key, opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={s.page}>
      {/* NAV */}
      <RenewalGnb active="listings" />

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
        <div className={s.subListingsInner}>
          <h2 className={s.subSectionTitle}>베스트라 인증 안심 매물</h2>

          {/* 결과 헤더 */}
          <div className={s.resultsHeader}>
            <p className={s.resultsCount}>
              총 <strong>{showMolit ? displayMolit.length : displayListings.length}개</strong>{' '}
              {showMolit ? `${molitRegion} 안심 매물` : certifiedOnly ? '안심인증 매물' : '안심 매물'}
            </p>
            <div className={s.resultsRight}>
              <button
                type="button"
                className={s.filterDdBtn}
                onClick={() => setCertifiedOnly((v) => !v)}
                aria-pressed={certifiedOnly}
                title="베스트라 안심인증매물만 보기"
                style={certifiedOnly ? { borderColor: '#22c55e', color: '#16a34a', background: '#f0fdf4', fontWeight: 700 } : undefined}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>안심인증만</span>
              </button>
              {renderDropdown('type', '건물유형', ['아파트', '단독', '다가구', '연립', '빌라'])}
              {renderDropdown('trade', '거래유형', ['매매', '전세', '단기임대', '초단기임대'])}
              {renderDropdown('size', '전체 평형', ['10평형', '20평형', '30평형', '40평형', '50평형', '50평형 이상'])}

              <div style={{ width: '1px', height: '20px', background: '#e8eaf0', margin: '0 4px' }}></div>

              <div className={s.locationFilters}>
                <select
                  className={s.locationSelect}
                  value={sido}
                  onChange={(e) => { setSido(e.target.value); setSigungu(''); }}
                >
                  <option value="">시 / 도</option>
                  {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  className={s.locationSelect}
                  value={sigungu}
                  onChange={(e) => setSigungu(e.target.value)}
                  disabled={sigunguList.length === 0}
                >
                  <option value="">시 / 군 / 구</option>
                  {sigunguList.map((sg) => <option key={sg} value={sg}>{sg}</option>)}
                </select>
              </div>

              <div className={s.viewToggle}>
                <button className={`${s.viewBtn} ${s.active}`} title="목록보기" type="button">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                    <line x1="1" y1="3" x2="14" y2="3" />
                    <line x1="1" y1="7.5" x2="14" y2="7.5" />
                    <line x1="1" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
                <button className={s.viewBtn} title="지도보기" type="button" onClick={() => goToMap()}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z" />
                    <circle cx="7.5" cy="5" r="1.4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 카드 그리드 (실데이터) */}
          {(showMolit ? molitLoading : loading) ? (
            <div className={s.subListingsGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 280, borderRadius: 10, background: '#f5f5f7' }} />
              ))}
            </div>
          ) : showMolit ? (
            <>
              {/* 비운영 도메인: 테스트 샘플은 '안심 매물' 형식·상세페이지로 국토부와 분리해 별도 블록 노출 */}
              {showFixtures && (
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', margin: '0 0 12px' }}>
                    베스트라 안심 매물 (테스트 샘플)
                  </p>
                  <div className={s.subListingsGrid}>
                    {displayFixtures.map((l) => <ListingCard key={l.id} listing={l} href={`/renewal/listing-db-detail?id=${l.id}`} />)}
                  </div>
                </div>
              )}
              {displayMolit.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{molitRegion} 국토부 실거래가 없습니다</p>
                  <p style={{ fontSize: 13 }}>시/군/구를 변경해 다시 검색해보세요</p>
                </div>
              ) : (
              <>
              {showFixtures && (
                <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px' }}>국토부 실거래</p>
              )}
              <div className={s.subListingsGrid}>
                {displayMolit.map((m, i) => (
                  <div
                    className={s.propertyCard}
                    key={m.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => goToMap({ aptName: m.aptName, dong: m.dong })}
                  >
                    <div className={`${s.propImg} ${s[PIMG[i % PIMG.length]]}`}>
                      <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                      <span className={s.badgeTrust} style={{ background: '#e0edff', color: '#2563eb' }}>국토부 실거래</span>
                    </div>
                    <div className={s.propBody}>
                      <div className={s.propPrice}>{formatEok(m.dealAmount)}</div>
                      <div className={s.propAddr}>{molitRegion} {m.dong} {m.aptName}</div>
                      <div className={s.propMeta}>
                        <span className={s.mType}>아파트</span>
                        <span className={s.mArea}>{m.area}㎡</span>
                        <span className={s.mFloor}>{m.floor}층</span>
                        <span className={s.mDate}>{m.dealDate} 거래</span>
                      </div>
                      <div className={s.propFooter}>
                        <span>{m.buildYear ? `${m.buildYear}년 준공` : ''}</span>
                        <span>국토부 실거래</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
              )}
            </>
          ) : displayListings.length === 0 ? (
            showFixtures ? (
              <div className={s.subListingsGrid}>
                {displayFixtures.map((l) => <ListingCard key={l.id} listing={l} href={`/renewal/listing-db-detail?id=${l.id}`} />)}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2' }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>조건에 맞는 매물이 없습니다</p>
                <p style={{ fontSize: 13 }}>필터를 변경해 다시 검색해보세요</p>
              </div>
            )
          ) : (
            <div className={s.subListingsGrid}>
              {/* 비운영 도메인: 샘플 3건도 동일한 안심매물 형식·상세페이지라 앞에 함께 노출 */}
              {showFixtures && displayFixtures.map((l) => <ListingCard key={l.id} listing={l} href={`/renewal/listing-db-detail?id=${l.id}`} />)}
              {displayListings.map((l) => <ListingCard key={l.id} listing={l} href={`/renewal/listing-db-detail?id=${l.id}`} />)}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerLogo}>
              <div className={s.flogoIcon}>V</div>
              <span className={s.flogoText}>VESTRA</span>
            </div>
            <p className={s.footerTagline}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
            <div className={s.footerContact}>
              BMI C&S | 대표이사 김동의<br />
              사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
              서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
              고객센터 010-8490-9271
            </div>
          </div>
          <div>
            <p className={s.footerColTitle}>Legal</p>
            <ul className={s.footerLinks}>
              <li><a href="#">개인정보처리방침</a></li>
              <li><a href="#">이용약관</a></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Product</p>
            <ul className={s.footerLinks}>
              <li><a href="#">기능 소개</a></li>
              <li><a href="#">요금제</a></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Company</p>
            <ul className={s.footerLinks}>
              <li><a href="#">회사 소개</a></li>
              <li><a href="#">채용</a></li>
              <li><a href="#">뉴스레터</a></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Connect</p>
            <ul className={s.footerLinks}>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 BMI-C&S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>
    </div>
  );
}
