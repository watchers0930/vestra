"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import s from "./RenewalGnb.module.css";
import { RENEWAL_MAIN as MAIN, RENEWAL_SUPPORT as SUPPORT, RENEWAL_ROUTES, type RenewalKey } from "./renewal-config";
import RenewalLoginModal from "./RenewalLoginModal";
import RenewalSignupModal from "./RenewalSignupModal";

/**
 * renewal 공통 헤더 GNB — 모든 renewal 페이지에서 <RenewalGnb active="..." /> 로 사용.
 * 메뉴/경로/정책은 renewal-config.ts 단일 소스에서 관리한다.
 */

export type RenewalGnbKey = RenewalKey;

export default function RenewalGnb({ active }: { active?: RenewalGnbKey }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const supportActive = SUPPORT.some((m) => m.key === active);
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name || "회원";
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupNotice, setSignupNotice] = useState<"not_registered" | "withdrawn" | undefined>();

  // 소셜 로그인 미가입/탈퇴 → 서버가 /home?auth=... 로 돌려보냄. 회원가입 모달을 안내와 함께 연다.
  // (useSearchParams 대신 마운트 후 window에서 읽어 프리렌더 Suspense 요구를 피한다)
  useEffect(() => {
    const auth = new URLSearchParams(window.location.search).get("auth");
    // 로그인(login) / 회원가입(signup, not_registered, withdrawn) 진입을 renewal 모달로 처리
    const valid = auth === "login" || auth === "signup" || auth === "not_registered" || auth === "withdrawn";
    if (!valid) return;
    // 마운트 시 URL 기반 1회 모달 오픈 (의도된 setState)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (auth === "login") {
      setShowLogin(true);
    } else {
      if (auth === "not_registered" || auth === "withdrawn") setSignupNotice(auth);
      setShowSignup(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // 쿼리 제거 (새로고침 시 모달 재오픈 방지)
    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

  return (
    <>
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href={RENEWAL_ROUTES.landing} className={s.navLogo}>
          <Image src="/vestra-symbol.png" alt="VESTRA" width={34} height={34} className={s.logoIcon} priority />
          <span className={s.logoText}>VESTRA</span>
        </Link>
        <ul className={s.navMenu}>
          {MAIN.map((m) => (
            <li key={m.key}>
              <Link href={m.href} className={active === m.key ? "active" : undefined}>{m.label}</Link>
            </li>
          ))}
          <li className={s.hasDrop}>
            <span className={`${s.navDropToggle}${supportActive ? " active" : ""}`}>
              고객지원
              <svg className={s.caret} viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <ul className={s.navDrop}>
              {SUPPORT.map((m) => (
                <li key={m.key}>
                  <Link href={m.href} className={active === m.key ? "active" : undefined}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
        <div className={s.navAuth}>
          {isLoggedIn ? (
            <>
              <span className={s.greet}>{userName}님</span>
              <span className={s.div}>|</span>
              <Link href={RENEWAL_ROUTES.profile}>마이페이지</Link>
              <span className={s.div}>|</span>
              <a onClick={() => signOut({ redirectTo: RENEWAL_ROUTES.home })} style={{ cursor: "pointer" }}>로그아웃</a>
            </>
          ) : (
            <>
              <a onClick={() => setShowLogin(true)} style={{ cursor: "pointer" }}>로그인</a>
              <span className={s.div}>|</span>
              <a onClick={() => setShowSignup(true)} style={{ cursor: "pointer" }}>회원가입</a>
            </>
          )}
        </div>
        <button className={s.navBurger} aria-label="메뉴 열기" onClick={() => setMenuOpen((o) => !o)}>
          <span></span><span></span><span></span>
        </button>
      </div>
      <ul className={`${s.navMob} ${menuOpen ? s.open : ""}`}>
        {MAIN.map((m) => (
          <li key={m.key}>
            <Link href={m.href} className={active === m.key ? "active" : undefined} onClick={() => setMenuOpen(false)}>{m.label}</Link>
          </li>
        ))}
        <li><span className={s.grp}>고객지원</span></li>
        {SUPPORT.map((m) => (
          <li key={m.key} className={s.sub}>
            <Link href={m.href} className={active === m.key ? "active" : undefined} onClick={() => setMenuOpen(false)}>· {m.label}</Link>
          </li>
        ))}
        <li>
          <div className={s.navMobAuth}>
            {isLoggedIn ? (
              <>
                <span>{userName}님</span>
                <Link href={RENEWAL_ROUTES.profile}>마이페이지</Link>
                <a onClick={() => signOut({ redirectTo: RENEWAL_ROUTES.home })} style={{ cursor: "pointer" }}>로그아웃</a>
              </>
            ) : (
              <>
                <a onClick={() => setShowLogin(true)} style={{ cursor: "pointer" }}>로그인</a>
                <a onClick={() => setShowSignup(true)} style={{ cursor: "pointer" }}>회원가입</a>
              </>
            )}
          </div>
        </li>
      </ul>
    </nav>
    {showLogin && (
      <RenewalLoginModal
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
      />
    )}
    {showSignup && (
      <RenewalSignupModal
        notice={signupNotice}
        onClose={() => { setShowSignup(false); setSignupNotice(undefined); }}
        onSwitchToLogin={() => { setShowSignup(false); setSignupNotice(undefined); setShowLogin(true); }}
      />
    )}
    </>
  );
}
