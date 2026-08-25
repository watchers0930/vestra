"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import RenewalLoginModal from "../renewal/_shared/RenewalLoginModal";
import RenewalSignupModal from "../renewal/_shared/RenewalSignupModal";
import CertifiedListings from "./components/CertifiedListings";
import { REGIONS } from "./regions";
import s from "./personal-home.module.css";


export default function PersonalHomeClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name || "회원";
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const featRef = useRef<HTMLDivElement>(null);

  const sigunguList = sido ? Object.keys(REGIONS[sido] ?? {}) : [];
  const dongList = sido && sigungu ? (REGIONS[sido]?.[sigungu] ?? []) : [];

  function handleSido(v: string) { setSido(v); setSigungu(""); setDong(""); }
  function handleSigungu(v: string) { setSigungu(v); setDong(""); }

  function goToArea() {
    const params = new URLSearchParams();
    if (sido) params.set("sido", sido);
    if (sigungu) params.set("sigungu", sigungu);
    if (dong) params.set("dong", dong);
    router.push(`/listings?${params.toString()}`);
  }

  useEffect(() => {
    const el = featRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollLeft / (el.offsetWidth - 14));
      setActiveDot(idx);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className={s.wrap}>

      {/* ─── NAV ─── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings">매물검색</Link></li>
            <li><Link href="/renewal/jeonse">전세보호</Link></li>
            <li><Link href="/renewal/rights">권리분석</Link></li>
            <li><Link href="/renewal/monitoring">등기감시</Link></li>
            <li><Link href="/renewal/contract">계약검토</Link></li>
            <li><Link href="/renewal/price-map">시세전망</Link></li>
            <li><Link href="/renewal/expert">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            {isLoggedIn ? (
              <>
                <span>{userName}님</span>
                <span className={s.navAuthDivider}>|</span>
                <Link href="/profile">마이페이지</Link>
                <span className={s.navAuthDivider}>|</span>
                <a onClick={() => signOut({ redirectTo: "/" })} style={{ cursor: "pointer" }}>로그아웃</a>
              </>
            ) : (
              <>
                <a onClick={() => setShowLoginModal(true)} style={{ cursor: "pointer" }}>로그인</a>
                <span className={s.navAuthDivider}>|</span>
                <a onClick={() => setShowSignupModal(true)} style={{ cursor: "pointer" }}>회원가입</a>
              </>
            )}
          </div>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴"
          >
            <span /><span /><span />
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li><Link href="/listings">매물검색</Link></li>
          <li><Link href="/renewal/jeonse">전세보호</Link></li>
          <li><Link href="/renewal/rights">권리분석</Link></li>
          <li><Link href="/renewal/monitoring">등기감시</Link></li>
          <li><Link href="/renewal/contract">계약검토</Link></li>
          <li><Link href="/renewal/price-map">시세전망</Link></li>
          <li><Link href="/renewal/expert">전문가상담</Link></li>
          <li>
            <div className={s.navMobileAuth}>
              {isLoggedIn ? (
                <>
                  <span>{userName}님</span>
                  <Link href="/profile">마이페이지</Link>
                  <a onClick={() => signOut({ redirectTo: "/" })} style={{ cursor: "pointer" }}>로그아웃</a>
                </>
              ) : (
                <>
                  <a onClick={() => setShowLoginModal(true)} style={{ cursor: "pointer" }}>로그인</a>
                  <a onClick={() => setShowSignupModal(true)} style={{ cursor: "pointer" }}>회원가입</a>
                </>
              )}
            </div>
          </li>
        </ul>
      </nav>

      {/* ─── HERO ─── */}
      <section className={s.hero}>
        <div className={s.heroPhoto} />
        <div className={s.heroInner}>
          <div className={s.heroText}>
            <p className={s.heroEyebrow}>AI-Powered Real Estate Curation</p>
            <h1 className={s.heroHeadline}>
              보이지 않는 위험까지 감지하는<br />
              부동산 권리분석 플랫폼
            </h1>
            <div className={s.heroBrand}>VESTRA</div>
            <p className={s.heroDesc}>
              VESTRA는 수만 개의 데이터 포인트를 정밀하게 분석하여<br />
              전문가의 통찰력을 디지털화합니다.
            </p>
          </div>
          <div className={s.heroRight}>
            <p className={s.heroSearchLabel}>살고 싶은 집을 찾아보세요</p>
            <div className={s.heroSearchStack}>
              <select value={sido} onChange={(e) => handleSido(e.target.value)}>
                <option value="">시 / 도 선택</option>
                {Object.keys(REGIONS).map((r) => <option key={r}>{r}</option>)}
              </select>
              <select value={sigungu} disabled={!sido} onChange={(e) => handleSigungu(e.target.value)}>
                <option value="">시 / 군 / 구 선택</option>
                {sigunguList.map((sg) => <option key={sg}>{sg}</option>)}
              </select>
              <select value={dong} disabled={!sigungu} onChange={(e) => setDong(e.target.value)}>
                <option value="">동 / 읍 / 면 선택</option>
                {dongList.map((d) => <option key={d}>{d}</option>)}
              </select>
              <button onClick={goToArea}>찾아가기</button>
            </div>
          </div>
        </div>
        <div className={s.heroFooter}>
          <span>출원 유형: 부동산 거래 위험도 산출장치 및 방법</span>
          <span className={s.heroFooterDivider}>|</span>
          <span>출원번호: 10-2026-0085160</span>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className={s.features}>
        <div className={s.featuresInner} ref={featRef}>
          <Link href="/renewal/jeonse" className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg1}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>전세 위험도 분석</h3>
              <p className={s.featureDesc}>계약 정보를 입력하면 전세를 설정 필요성과<br />시가 위험도를 AI가 자동 분석합니다.</p>
            </div>
          </Link>
          <Link href="/renewal/rights" className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg2}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>등기부 관리 분석</h3>
              <p className={s.featureDesc}>강구 을구 권리관계를 사가 분석하여 위험도와<br />시가 위험도를 한에서 한다면 제공합니다.</p>
            </div>
          </Link>
          <Link href="/renewal/monitoring" className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg3}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>등기감시</h3>
              <p className={s.featureDesc}>등기부동의 변동을 실시간으로 감시하고<br />우경성 권흥 중점을 제공합니다.</p>
            </div>
          </Link>
        </div>
        <div className={s.featureDots}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${s.dot} ${activeDot === i ? s.dotActive : ""}`} />
          ))}
        </div>
      </section>

      {/* ─── LISTINGS ─── */}
      <section className={s.listings} id="listings">
        <div className={s.listingsInner}>
          <h2 className={s.sectionHeading}>베스트라 인증 안심 매물</h2>
          <CertifiedListings />
        </div>
      </section>

      {/* ─── SPECIALIST ─── */}
      <section className={s.specialist}>
        <div className={s.specialistInner}>
          <h2 className={s.specialistTitle}>베스트라와 함께 하는 부동산 SPECIALIST</h2>
          <div className={s.specialistGrid}>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar1}`} />
              <span className={s.specRole}>조은법무법인</span>
              <span className={s.specName}>변호사 홍길동</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar2}`} />
              <span className={s.specRole}>회계법인 회계법인</span>
              <span className={s.specName}>회계사 강정동</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar3}`} />
              <span className={s.specRole}>대림법무법인</span>
              <span className={s.specName}>법무사 김도현</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar4}`} />
              <span className={s.specRole}>하나공인중개사사무소</span>
              <span className={s.specName}>중개사 박민준</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar5}`} />
              <span className={s.specRole}>한울법무법인</span>
              <span className={s.specName}>변호사 이수진</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerLogo}>
              <div className={s.flogoIcon}>V</div>
              <span className={s.flogoText}>VESTRA</span>
            </div>
            <p className={s.footerTagline}>
              The Digital Curator of Real Estate<br />
              AI 기반 부동산 자산관리 플랫폼
            </p>
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
              <li><Link href="/privacy">개인정보처리방침</Link></li>
              <li><Link href="/terms">이용약관</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Product</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">기능 소개</Link></li>
              <li><Link href="/pricing">요금제</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Company</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">회사 소개</Link></li>
              <li><Link href="#">채용</Link></li>
              <li><Link href="#">뉴스레터</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Connect</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">LinkedIn</Link></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 BMI-C&amp;S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>

      {showLoginModal && (
        <RenewalLoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }}
        />
      )}
      {showSignupModal && (
        <RenewalSignupModal
          onClose={() => setShowSignupModal(false)}
          onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true); }}
        />
      )}
    </div>
  );
}
