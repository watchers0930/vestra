"use client";

import { useState } from "react";
import Link from "next/link";
import s from "./RenewalGnb.module.css";

/**
 * renewal 공통 헤더 GNB — 모든 renewal 페이지에서 <RenewalGnb active="..." /> 로 사용.
 * 메뉴/드롭다운을 한 곳에서 관리한다.
 */

export type RenewalGnbKey =
  | "listings" | "jeonse" | "rights" | "monitoring" | "contract" | "price-map"
  | "expert" | "assistant" | "official-price" | "tax";

const MAIN: { key: RenewalGnbKey; href: string; label: string }[] = [
  { key: "listings", href: "/renewal/listings-list", label: "매물검색" },
  { key: "jeonse", href: "/renewal/jeonse", label: "전세보호" },
  { key: "rights", href: "/renewal/rights", label: "권리분석" },
  { key: "monitoring", href: "/renewal/monitoring", label: "등기감시" },
  { key: "contract", href: "/renewal/contract", label: "계약검토" },
  { key: "price-map", href: "/renewal/price-map", label: "시세지도" },
];

const SUPPORT: { key: RenewalGnbKey; href: string; label: string }[] = [
  { key: "expert", href: "/renewal/expert", label: "전문가연결" },
  { key: "assistant", href: "/renewal/assistant", label: "AI 어시스턴트" },
  { key: "official-price", href: "/renewal/official-price", label: "공시가격조회" },
  { key: "tax", href: "/renewal/tax", label: "세금계산" },
];

export default function RenewalGnb({ active }: { active?: RenewalGnbKey }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const supportActive = SUPPORT.some((m) => m.key === active);

  return (
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href="/home" className={s.navLogo}>
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
          <span className={s.greet}>홍길동님</span>
          <span className={s.div}>|</span>
          <Link href="/profile">마이페이지</Link>
          <span className={s.div}>|</span>
          <Link href="/logout">로그아웃</Link>
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
            <span>홍길동님</span>
            <Link href="/profile">마이페이지</Link>
            <Link href="/logout">로그아웃</Link>
          </div>
        </li>
      </ul>
    </nav>
  );
}
