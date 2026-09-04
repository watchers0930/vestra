"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../realtor-home.module.css";
import { REALTOR_ROUTES } from "../../_shared/realtor-config";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function RealtorHero({
  userName,
  todoCount,
  signCount,
  newCount,
}: {
  userName: string;
  todoCount: number;
  signCount: number;
  newCount: number;
}) {
  // 날짜는 마운트 후 표기(SSR/CSR 시각 불일치 방지)
  const [today, setToday] = useState("");
  useEffect(() => {
    const d = new Date();
    // 마운트 후 1회 날짜 세팅 (SSR/CSR 시각 불일치 방지 — 의도된 effect setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`);
  }, []);

  return (
    <section className={s.hero}>
      <div className={s.heroPhoto} />
      <div className={s.heroInner}>
        <div className={s.heroText}>
          <div className={s.heroEyebrow}>Realtor Workspace · 중개 관리</div>
          <p className={s.heroName}><b>{userName}</b>님</p>
          <p className={s.heroHeadline}>
            {todoCount > 0
              ? <>오늘 처리할 일이 <u>{todoCount}건</u> 있어요 · 서명 대기 {signCount} · 신규 의향서 {newCount}</>
              : <>오늘은 대기 중인 업무가 없어요 · 새 매물을 등록해보세요</>}
          </p>
          <p className={s.heroDate}>{today}</p>
        </div>
        <div className={s.heroRight}>
          <div className={s.heroQuickLabel}>빠른 작업</div>
          <div className={s.heroCard}>
            <Link href={REALTOR_ROUTES.listingNew} className={s.heroCta}>
              <span className={s.plus}>＋</span> 신규 매물 등록
            </Link>
            <div className={s.heroSubLinks}>
              <Link href={REALTOR_ROUTES.listings}>매물 목록</Link>
              <Link href={REALTOR_ROUTES.agent}>중개관리 CRM</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
