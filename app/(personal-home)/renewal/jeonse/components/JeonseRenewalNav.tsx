"use client";

import { useState } from "react";
import Link from "next/link";
import s from "../jeonse-renewal.module.css";

/** 상단 GNB + 모바일 메뉴. 링크는 renewal 경로로 연결. 전세보호 active. */
export default function JeonseRenewalNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menu = [
    { href: "/renewal/listings-list", label: "매물검색" },
    { href: "/renewal/jeonse", label: "전세보호", active: true },
    { href: "/renewal/rights", label: "권리분석" },
    { href: "/renewal/monitoring", label: "등기감시" },
    { href: "/renewal/contract", label: "계약검토" },
    { href: "/renewal/price-map", label: "시세지도" },
    { href: "/expert-connect", label: "전문가상담" },
  ];

  return (
    <nav className={s.navBar}>
      <div className={s.navInner}>
        <Link href="/home" className={s.navLogo}>
          <div className={s.logoIcon}>V</div>
          <span className={s.logoText}>VESTRA</span>
        </Link>
        <ul className={s.navMenu}>
          {menu.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className={m.active ? "active" : undefined}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={s.navAuth}>
          <Link href="/profile">마이페이지</Link>
        </div>
        <button
          className={s.navBurger}
          aria-label="메뉴 열기"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      <ul className={`${s.navMob} ${menuOpen ? s.open : ""}`}>
        {menu.map((m) => (
          <li key={m.href}>
            <Link href={m.href} onClick={() => setMenuOpen(false)}>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
