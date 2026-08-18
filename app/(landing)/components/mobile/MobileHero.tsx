"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TICKER_ITEMS } from "../../constants";
import { MobileRadar } from "./MobileRadar";
import s from "./mobile-landing.module.css";

export function MobileHero() {
  const router = useRouter();
  const [address, setAddress] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = address.trim();
    if (addr.length < 4) return;
    router.push(`/rights?address=${encodeURIComponent(addr)}`);
  }

  return (
    <section className={s.hero}>
      <MobileRadar className={s.radar} />
      <span className={s.pill}><span className={s.pillDot} />AI-Powered Real Estate Platform</span>
      <h2 className={s.heroH}>보이지 않는 위험까지<br /><em>AI가 먼저</em> 감지합니다</h2>
      <p className={s.heroLead}>등기부등본 분석부터 전세 안전진단, 등기변동위험감지, 계약서 검토까지 — 전문가 수준의 통찰을 누구에게나.</p>
      <form className={s.search} role="search" onSubmit={handleSubmit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="분석할 주소를 입력하세요"
          aria-label="주소 입력"
        />
        <button type="submit">분석 시작</button>
      </form>
      <p className={s.note}>로그인 없이 기본 분석 가능 · 상세 리포트는 회원 전용</p>

      <div className={s.ticker} aria-hidden="true">
        <div className={s.tickerTrack}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}
