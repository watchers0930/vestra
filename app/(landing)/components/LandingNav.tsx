"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`lnd-nav${scrolled ? " lnd-nav--scrolled" : ""}`}
      aria-label="메인 내비게이션"
    >
      <div className="lnd-nav-inner">
        <Link href="/" className="lnd-logo">VESTRA</Link>
        <div className="lnd-nav-r">
          <Link href="/login" className="lnd-login">로그인</Link>
          <Link href="/login" className="lnd-start">시작하기</Link>
        </div>
      </div>
    </nav>
  );
}
