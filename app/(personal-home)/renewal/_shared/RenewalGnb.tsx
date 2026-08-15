"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import s from "./RenewalGnb.module.css";
import { RENEWAL_MAIN as MAIN, RENEWAL_SUPPORT as SUPPORT, RENEWAL_ROUTES, type RenewalKey } from "./renewal-config";
import RenewalLoginModal from "./RenewalLoginModal";

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

  return (
    <>
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href={RENEWAL_ROUTES.landing} className={s.navLogo}>
          <div className={s.logoIcon}>V</div>
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
              <Link href={RENEWAL_ROUTES.signup}>회원가입</Link>
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
                <Link href={RENEWAL_ROUTES.signup}>회원가입</Link>
              </>
            )}
          </div>
        </li>
      </ul>
    </nav>
    {showLogin && <RenewalLoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
