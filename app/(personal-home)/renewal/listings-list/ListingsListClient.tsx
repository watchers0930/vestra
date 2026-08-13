"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import s from "./listings-list.module.css";

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

type DropdownKey = 'type' | 'trade' | 'size' | null;

interface DropdownState {
  type: string;
  trade: string;
  size: string;
}

export default function ListingsListClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [dropdownLabels, setDropdownLabels] = useState<DropdownState>({
    type: '건물유형',
    trade: '거래유형',
    size: '전체 평형',
  });
  const [dropdownActive, setDropdownActive] = useState<Record<string, boolean>>({
    type: false,
    trade: false,
    size: false,
  });
  const [selectedOpt, setSelectedOpt] = useState<Record<string, string>>({
    type: '건물유형 (전체)',
    trade: '거래유형 (전체)',
    size: '전체 평형',
  });
  const [sido, setSido] = useState('서울특별시');
  const [sigungu, setSigungu] = useState('');

  const sigunguList = sido && REGIONS[sido] ? REGIONS[sido] : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(`.${s.filterDdWrap}`)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const selectDropdown = (
    key: 'type' | 'trade' | 'size',
    value: string,
    defaultValues: string[]
  ) => {
    setDropdownLabels((prev) => ({ ...prev, [key]: value }));
    setDropdownActive((prev) => ({
      ...prev,
      [key]: !defaultValues.includes(value),
    }));
    setSelectedOpt((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  return (
    <div className={s.page}>
      {/* NAV */}
      <nav>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings" className={s.active}>매물검색</Link></li>
            <li><Link href="/jeonse">전세보호</Link></li>
            <li><Link href="/monitoring">관리분석</Link></li>
            <li><a href="#">등기감시</a></li>
            <li><Link href="/contract">계약검토</Link></li>
            <li><Link href="/prediction">시세전망</Link></li>
            <li><Link href="/expert-connect">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            <Link href="/login">로그인</Link>
            <span className={s.divider}>|</span>
            <a href="#">마이페이지</a>
            <span className={s.divider}>|</span>
            <Link href="/register">회원가입</Link>
          </div>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ''}`}
            aria-label="메뉴"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ''}`}>
          <li><Link href="/listings">매물검색</Link></li>
          <li><Link href="/jeonse">전세보호</Link></li>
          <li><Link href="/monitoring">관리분석</Link></li>
          <li><a href="#">등기감시</a></li>
          <li><Link href="/contract">계약검토</Link></li>
          <li><Link href="/prediction">시세전망</Link></li>
          <li><Link href="/expert-connect">전문가상담</Link></li>
          <li>
            <div className={s.navMobileAuth}>
              <Link href="/login">로그인</Link>
              <a href="#">마이페이지</a>
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
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      {/* LISTINGS */}
      <section className={s.subListings}>
        <div className={s.subListingsInner}>
          <h2 className={s.subSectionTitle}>베스트라 인증 안심전세 매물</h2>

          {/* 결과 헤더 */}
          <div className={s.resultsHeader}>
            <p className={s.resultsCount}>총 <strong>9개</strong> 매물</p>
            <div className={s.resultsRight}>
              {/* 건물유형 */}
              <div className={s.filterDdWrap}>
                <button
                  className={`${s.filterDdBtn} ${dropdownActive.type ? s.active : ''}`}
                  onClick={() => toggleDropdown('type')}
                >
                  <span>{dropdownLabels.type}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="2,4 6,8 10,4" />
                  </svg>
                </button>
                <div className={`${s.filterDdPanel} ${openDropdown === 'type' ? s.open : ''}`}>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '건물유형 (전체)' ? s.selected : ''}`} onClick={() => selectDropdown('type', '건물유형', ['건물유형'])}>건물유형 (전체)</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '아파트' ? s.selected : ''}`} onClick={() => selectDropdown('type', '아파트', ['건물유형'])}>아파트</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '단독' ? s.selected : ''}`} onClick={() => selectDropdown('type', '단독', ['건물유형'])}>단독</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '다가구' ? s.selected : ''}`} onClick={() => selectDropdown('type', '다가구', ['건물유형'])}>다가구</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '연립' ? s.selected : ''}`} onClick={() => selectDropdown('type', '연립', ['건물유형'])}>연립</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.type === '빌라' ? s.selected : ''}`} onClick={() => selectDropdown('type', '빌라', ['건물유형'])}>빌라</button>
                </div>
              </div>

              {/* 거래유형 */}
              <div className={s.filterDdWrap}>
                <button
                  className={`${s.filterDdBtn} ${dropdownActive.trade ? s.active : ''}`}
                  onClick={() => toggleDropdown('trade')}
                >
                  <span>{dropdownLabels.trade}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="2,4 6,8 10,4" />
                  </svg>
                </button>
                <div className={`${s.filterDdPanel} ${openDropdown === 'trade' ? s.open : ''}`}>
                  <button className={`${s.filterDdOpt} ${selectedOpt.trade === '거래유형 (전체)' ? s.selected : ''}`} onClick={() => selectDropdown('trade', '거래유형', ['거래유형'])}>거래유형 (전체)</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.trade === '매매' ? s.selected : ''}`} onClick={() => selectDropdown('trade', '매매', ['거래유형'])}>매매</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.trade === '전세' ? s.selected : ''}`} onClick={() => selectDropdown('trade', '전세', ['거래유형'])}>전세</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.trade === '단기임대' ? s.selected : ''}`} onClick={() => selectDropdown('trade', '단기임대', ['거래유형'])}>단기임대</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.trade === '초단기임대' ? s.selected : ''}`} onClick={() => selectDropdown('trade', '초단기임대', ['거래유형'])}>초단기임대</button>
                </div>
              </div>

              {/* 평형 */}
              <div className={s.filterDdWrap}>
                <button
                  className={`${s.filterDdBtn} ${dropdownActive.size ? s.active : ''}`}
                  onClick={() => toggleDropdown('size')}
                >
                  <span>{dropdownLabels.size}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="2,4 6,8 10,4" />
                  </svg>
                </button>
                <div className={`${s.filterDdPanel} ${openDropdown === 'size' ? s.open : ''}`}>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '전체 평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '전체 평형', ['전체 평형'])}>전체 평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '10평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '10평형', ['전체 평형'])}>10평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '20평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '20평형', ['전체 평형'])}>20평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '30평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '30평형', ['전체 평형'])}>30평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '40평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '40평형', ['전체 평형'])}>40평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '50평형' ? s.selected : ''}`} onClick={() => selectDropdown('size', '50평형', ['전체 평형'])}>50평형</button>
                  <button className={`${s.filterDdOpt} ${selectedOpt.size === '50평형 이상' ? s.selected : ''}`} onClick={() => selectDropdown('size', '50평형 이상', ['전체 평형'])}>50평형 이상</button>
                </div>
              </div>

              <div style={{ width: '1px', height: '20px', background: '#e8eaf0', margin: '0 4px' }}></div>

              <div className={s.locationFilters}>
                <select
                  className={s.locationSelect}
                  value={sido}
                  onChange={(e) => { setSido(e.target.value); setSigungu(''); }}
                >
                  <option value="">시 / 도</option>
                  <option>서울특별시</option>
                  <option>부산광역시</option>
                  <option>대구광역시</option>
                  <option>인천광역시</option>
                  <option>광주광역시</option>
                  <option>대전광역시</option>
                  <option>울산광역시</option>
                  <option>세종특별자치시</option>
                  <option>경기도</option>
                  <option>강원도</option>
                  <option>충청북도</option>
                  <option>충청남도</option>
                  <option>전라북도</option>
                  <option>전라남도</option>
                  <option>경상북도</option>
                  <option>경상남도</option>
                  <option>제주특별자치도</option>
                </select>
                <select
                  className={s.locationSelect}
                  value={sigungu}
                  onChange={(e) => setSigungu(e.target.value)}
                  disabled={!sido || sigunguList.length === 0}
                >
                  <option value="">시 / 군 / 구</option>
                  {sigunguList.map((sg) => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
              </div>

              <div className={s.viewToggle}>
                <button className={`${s.viewBtn} ${s.active}`} title="목록보기">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                    <line x1="1" y1="3" x2="14" y2="3" />
                    <line x1="1" y1="7.5" x2="14" y2="7.5" />
                    <line x1="1" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
                <Link href="/renewal/listings-map" className={s.viewBtn} title="지도보기">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z" />
                    <circle cx="7.5" cy="5" r="1.4" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className={s.subListingsGrid}>

            {/* Row 1 Card 1 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg1}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
                <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>오피스텔</span>
                  <span className={s.mArea}>33.2㎡</span>
                  <span className={s.mFloor}>8층</span>
                  <span className={s.mDate}>입주 1달 15일 이내</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>2</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 1 Card 2 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg5}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
                <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>빌라/다세대</span>
                  <span className={s.mArea}>59.4㎡</span>
                  <span className={s.mFloor}>3층</span>
                  <span className={s.mDate}>입주 1달 1일</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>6</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 1 Card 3 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg3}`}>
                <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                <span className={s.badgeTrust}>안심인증</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>13.5억</div>
                <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>아파트</span>
                  <span className={s.mArea}>84.9㎡</span>
                  <span className={s.mFloor}>9/12층</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>49</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 2 Card 1 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg1}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
                <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>오피스텔</span>
                  <span className={s.mArea}>33.2㎡</span>
                  <span className={s.mFloor}>8층</span>
                  <span className={s.mDate}>입주 1달 15일 이내</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>2</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 2 Card 2 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg5}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
                <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>빌라/다세대</span>
                  <span className={s.mArea}>59.4㎡</span>
                  <span className={s.mFloor}>3층</span>
                  <span className={s.mDate}>입주 1달 1일</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>6</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 2 Card 3 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg3}`}>
                <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                <span className={s.badgeTrust}>안심인증</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>13.5억</div>
                <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>아파트</span>
                  <span className={s.mArea}>84.9㎡</span>
                  <span className={s.mFloor}>9/12층</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>49</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 3 Card 1 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg1}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
                <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>오피스텔</span>
                  <span className={s.mArea}>33.2㎡</span>
                  <span className={s.mFloor}>8층</span>
                  <span className={s.mDate}>입주 1달 15일 이내</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>2</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 3 Card 2 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg5}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
                <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>빌라/다세대</span>
                  <span className={s.mArea}>59.4㎡</span>
                  <span className={s.mFloor}>3층</span>
                  <span className={s.mDate}>입주 1달 1일</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>6</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

            {/* Row 3 Card 3 */}
            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg3}`}>
                <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                <span className={s.badgeTrust}>안심인증</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>13.5억</div>
                <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
                <div className={s.propMeta}>
                  <span className={s.mType}>아파트</span>
                  <span className={s.mArea}>84.9㎡</span>
                  <span className={s.mFloor}>9/12층</span>
                </div>
                <div className={s.propFooter}>
                  <span className={s.propLikes}>49</span>
                  <span>서울공인중개사</span>
                </div>
              </div>
            </div>

          </div>
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
