import { notFound } from "next/navigation";
import RenewalGnb from "../../../_shared/RenewalGnb";
import SiteFooter from "@/components/layout/SiteFooter";
import s from "../../monitoring-renewal.module.css";
import { guestMonitoringEnabled } from "@/lib/guest-monitoring/config";
import GuestApplyClient from "./GuestApplyClient";

export const metadata = {
  title: "비회원 등기감시 신청 - VESTRA",
  description: "회원가입 없이 등기부등본 1건을 1개월간 감시 신청합니다.",
};

/**
 * 비회원 신청 라우트. 본인인증·결제 프로바이더가 되돌아오는 안정적 반환 URL이며,
 * GuestApplyClient 가 리다이렉트 복귀 흐름(window.location/sessionStorage)을 재개한다.
 * 서버 기능 플래그(GUEST_MONITORING_ENABLED) OFF면 라우트 자체를 비활성(404)한다(설계 §0·§3.0).
 */
export default function GuestApplyPage() {
  if (!guestMonitoringEnabled()) notFound();
  return (
    <>
      <RenewalGnb active="monitoring" />
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Registry Monitor</span>
          <h1>비회원 등기감시 신청</h1>
          <p className={s.subHeroSub}>회원가입 없이 물건 1건을 1개월간 감시합니다</p>
        </div>
      </section>
      <div className={s.pageWrap}>
        <GuestApplyClient />
      </div>
      <SiteFooter />
    </>
  );
}
