"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import s from "./RealtorGnb.module.css";
import {
  REALTOR_ROUTES,
  REALTOR_MAIN,
  REALTOR_ANALYSIS,
  REALTOR_TRAILING,
} from "./realtor-config";

/**
 * 사업자(중개사) 공통 헤더 GNB — renewal GNB 스타일을 계승하되 사업자 메뉴를 렌더한다.
 * 메뉴/경로는 realtor-config.ts 단일 소스에서 관리한다.
 */
export default function RealtorGnb() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || "중개사";

  const isActive = (href: string) =>
    href === REALTOR_ROUTES.home ? pathname === href : pathname.startsWith(href);
  const analysisActive = REALTOR_ANALYSIS.some((m) => pathname.startsWith(m.href));

  return (
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href={REALTOR_ROUTES.home} className={s.navLogo}>
          <Image src="/vestra-symbol.png" alt="VESTRA" width={34} height={34} className={s.logoIcon} priority />
          <span className={s.logoText}>VESTRA</span>
          <span className={s.bizBadge}>중개사</span>
        </Link>

        <ul className={s.navMenu}>
          {REALTOR_MAIN.map((m) => (
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
              {REALTOR_ANALYSIS.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </li>
          {REALTOR_TRAILING.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className={isActive(m.href) ? "active" : undefined}>{m.label}</Link>
            </li>
          ))}
        </ul>

        <div className={s.navAuth}>
          <span className={s.greet}>{userName}님</span>
          <span className={s.div}>|</span>
          <Link href={REALTOR_ROUTES.profile}>마이페이지</Link>
          <span className={s.div}>|</span>
          <a onClick={() => signOut({ redirectTo: REALTOR_ROUTES.landing })}>로그아웃</a>
        </div>

        <button className={s.navBurger} aria-label="메뉴 열기" onClick={() => setMenuOpen((o) => !o)}>
          <span></span><span></span><span></span>
        </button>
      </div>

      <ul className={`${s.navMob} ${menuOpen ? s.open : ""}`}>
        {REALTOR_MAIN.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>{m.label}</Link>
          </li>
        ))}
        <li><span className={s.grp}>분석 서비스</span></li>
        {REALTOR_ANALYSIS.map((m) => (
          <li key={m.href} className={s.sub}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>· {m.label}</Link>
          </li>
        ))}
        {REALTOR_TRAILING.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={isActive(m.href) ? "active" : undefined} onClick={() => setMenuOpen(false)}>{m.label}</Link>
          </li>
        ))}
        <li>
          <div className={s.navMobAuth}>
            <span>{userName}님</span>
            <Link href={REALTOR_ROUTES.profile} onClick={() => setMenuOpen(false)}>마이페이지</Link>
            <a onClick={() => signOut({ redirectTo: REALTOR_ROUTES.landing })}>로그아웃</a>
          </div>
        </li>
      </ul>
    </nav>
  );
}
