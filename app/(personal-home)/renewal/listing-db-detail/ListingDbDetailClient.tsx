"use client";

import s from "../listing-detail/listing-detail.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import ListingDbDetailContent from "./ListingDbDetailContent";
import SiteFooter from "@/components/layout/SiteFooter";

export default function ListingDbDetailClient() {
  return (
    <>
      <RenewalGnb active="listings" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroInner}>
          <p className={s.subHeroText}>
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      <ListingDbDetailContent />

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
