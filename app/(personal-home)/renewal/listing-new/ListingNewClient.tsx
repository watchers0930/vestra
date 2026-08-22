"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import RenewalGnb from "../_shared/RenewalGnb";
import { ListingNewForm } from "./components/ListingNewForm";
import s from "./listing-new.module.css";

export default function ListingNewClient() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const role = user?.role || "PERSONAL";
  const isBizRole = role === "RENTAL_BIZ" || role === "BUSINESS" || role === "REALESTATE";
  // 사업자 회원은 인증 완료(verified) 후에만 등록 가능 — 서버 가드(POST /api/listings)와 일치
  const bizNeedsVerify = isBizRole && user?.verifyStatus !== "verified";
  // 매물 등록 자격: 임대인(LANDLORD) / 인증된 사업자 / 관리자 (임차인·비로그인·미인증사업자 제외)
  const canManage =
    user?.userType === "LANDLORD" || (isBizRole && user?.verifyStatus === "verified") || role === "ADMIN";

  return (
    <>
      <RenewalGnb />

      <section className={s.subHero}>
        <div className={s.subHeroBg} />
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Register</span>
          <h1>매물 등록</h1>
          <p className={s.subHeroSub}>안심 매물을 등록하고 검증받으세요</p>
        </div>
      </section>

      {status === "loading" ? (
        <div className={s.gate}><p className={s.gateSub}>불러오는 중…</p></div>
      ) : !user ? (
        <div className={s.gate}>
          <p className={s.gateTitle}>로그인이 필요합니다</p>
          <p className={s.gateSub}>매물 등록은 로그인 후 이용하실 수 있습니다.</p>
          <Link href="/login" className={s.gateBtn}>로그인하기</Link>
        </div>
      ) : bizNeedsVerify ? (
        <div className={s.gate}>
          <p className={s.gateTitle}>사업자 인증 후 등록할 수 있습니다</p>
          <p className={s.gateSub}>사업자 인증이 완료되면 매물을 등록할 수 있습니다.<br />현재 인증 심사 중이거나 미신청 상태입니다. 마이페이지에서 인증을 진행해주세요.</p>
          <Link href="/profile" className={s.gateBtn}>마이페이지로</Link>
        </div>
      ) : !canManage ? (
        <div className={s.gate}>
          <p className={s.gateTitle}>매물 등록 권한이 없습니다</p>
          <p className={s.gateSub}>매물 등록은 임대인·임대사업자·부동산·기업 회원만 가능합니다.<br />마이페이지에서 회원 유형을 확인해주세요.</p>
          <Link href="/profile" className={s.gateBtn}>마이페이지로</Link>
        </div>
      ) : (
        <ListingNewForm />
      )}
    </>
  );
}
