"use client";

import s from "./keepzip-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { KeepzipJourney } from "./KeepzipJourney";

export default function KeepzipRenewalContent() {
  return (
    <>
      <RenewalGnb active="keepzip" />

      <section className={s.subHero}>
        <div className={s.subHeroBg} />
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>KEEPZIP</span>
          <h1>AI 내용증명</h1>
          <p className={s.subHeroSub}>정보를 입력하면 AI가 초안을 만들어드립니다. 변호사 검토·직인 후 우체국 등기로 발송됩니다.</p>
        </div>
      </section>

      <KeepzipJourney />
    </>
  );
}
