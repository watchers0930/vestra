"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import s from "./RealtorGnb.module.css";
import {
  LANDLORD_ROUTES,
  LANDLORD_MAIN,
  LANDLORD_ANALYSIS,
  LANDLORD_TRAILING,
  LANDLORD_SUPPORT,
} from "./landlord-config";

/**
 * 사업자(임대사업자) 공통 헤더 GNB — renewal GNB 스타일을 계승하되 임대사업자 메뉴를 렌더한다.
 * 중개사 GNB(RealtorGnb)와 스타일(CSS module)을 공유하고, 메뉴/경로만 landlord-config를 참조한다.
 */
export default function LandlordGnb() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || "임대사업자";

  const isActive = (href: string) =>
    href === LANDLORD_ROUTES.home ? pathname === href : pathname.startsWith(href);
  const analysisActive = LANDLORD_ANALYSIS.some((m) => pathname.startsWith(m.href));
  const supportActive = LANDLORD_SUPPORT.some((m) => pathname.startsWith(m.href));

  return (
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href={LANDLORD_ROUTES.home} className={s.navLogo}>
          <Image src="/vestra-symbol.png" alt="VESTRA" width={34} height={34} className={s.logoIcon} priority />
          <span className={s.logoText}>VESTRA</span>
          <span className={s.bizBadge}>임대사업자</span>
        </Link>

        <ul className={s.navMenu}>
          {LANDLORD_MAIN.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
            </li>
          ))}
          <li className={s.hasDrop}>
            <span className={`${s.navDropToggle}${analysisActive ? " active" : ""}`}>
              분석 서비스
              <svg className={s.caret} viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <ul className={s.navDrop}>
              {LANDLORD_ANALYSIS.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </li>
          {LANDLORD_TRAILING.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
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
              {LANDLORD_SUPPORT.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>

        <div className={s.navAuth}>
          <span className={s.greet}>{userName}님</span>
          <span className={s.div}>|</span>
          <Link href={LANDLORD_ROUTES.profile}>마이페이지</Link>
          <span className={s.div}>|</span>
          <a onClick={() => signOut({ redirectTo: "/home?auth=login" })}>로그아웃</a>
        </div>

        <button className={s.navBurger} aria-label="메뉴 열기" onClick={() => setMenuOpen((o) => !o)}>
          <span></span><span></span><span></span>
        </button>
      </div>

      <ul className={`${s.navMob} ${menuOpen ? s.open : ""}`}>
        {LANDLORD_MAIN.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>{m.label}</Link>
          </li>
        ))}
        <li><span className={s.grp}>분석 서비스</span></li>
        {LANDLORD_ANALYSIS.map((m) => (
          <li key={m.href} className={s.sub}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>· {m.label}</Link>
          </li>
        ))}
        {LANDLORD_TRAILING.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>{m.label}</Link>
          </li>
        ))}
        <li><span className={s.grp}>고객지원</span></li>
        {LANDLORD_SUPPORT.map((m) => (
          <li key={m.href} className={s.sub}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>· {m.label}</Link>
          </li>
        ))}
        <li>
          <div className={s.navMobAuth}>
            <span>{userName}님</span>
            <Link href={LANDLORD_ROUTES.profile} onClick={() => setMenuOpen(false)}>마이페이지</Link>
            <a onClick={() => signOut({ redirectTo: "/home?auth=login" })}>로그아웃</a>
          </div>
        </li>
      </ul>
    </nav>
  );
}
