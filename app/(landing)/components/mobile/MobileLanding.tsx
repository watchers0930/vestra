import { MobileHero } from "./MobileHero";
import { MobileTrust } from "./MobileTrust";
import { MobileSituation } from "./MobileSituation";
import { MobileFeatures } from "./MobileFeatures";
import { MobileSteps } from "./MobileSteps";
import { MobilePricing } from "./MobilePricing";
import { MobileTestimonials } from "./MobileTestimonials";
import { MobileCta } from "./MobileCta";
import s from "./mobile-landing.module.css";

/** 모바일 전용 랜딩 — 섹션 목적에 맞춰 가로 스크롤/세로를 배분 */
export function MobileLanding() {
  return (
    <div className={s.wrap}>
      <MobileHero />
      <MobileTrust />
      <MobileSituation />
      <MobileFeatures />
      <MobileSteps />
      <MobilePricing />
      <MobileTestimonials />
      <MobileCta />
    </div>
  );
}
