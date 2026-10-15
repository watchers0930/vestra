import { notFound } from "next/navigation";
import RenewalGnb from "../../../_shared/RenewalGnb";
import SiteFooter from "@/components/layout/SiteFooter";
import s from "../../monitoring-renewal.module.css";
import { guestMonitoringEnabled } from "@/lib/guest-monitoring/config";
import GuestStatusClient from "./GuestStatusClient";

export const metadata = {
  title: "비회원 등기감시 현황 조회 - VESTRA",
  description: "본인인증 후 비회원으로 신청한 등기감시 물건의 기록을 조회합니다.",
};

/**
 * 비회원 현황 조회 라우트. 본인인증 프로바이더의 안정적 반환 URL이며,
 * GuestStatusClient 가 세션 쿠키 기반으로 조회 권한을 탐지한다.
 * 서버 기능 플래그(GUEST_MONITORING_ENABLED) OFF면 라우트 자체를 비활성(404)한다(설계 §0·§3.0).
 */
export default function GuestStatusPage() {
  if (!guestMonitoringEnabled()) notFound();
  return (
    <>
      <RenewalGnb active="monitoring" />
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Registry Monitor</span>
          <h1>감시 현황 조회</h1>
          <p className={s.subHeroSub}>본인인증 후 신청하신 물건의 감시 기록을 확인하세요</p>
        </div>
      </section>
      <div className={s.pageWrap}>
        <GuestStatusClient />
      </div>
      <SiteFooter />
    </>
  );
}
