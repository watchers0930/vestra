"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import s from "@/app/(biz)/realtor/realtor-home.module.css";
import { LANDLORD_ROUTES } from "@/app/(biz)/_shared/landlord-config";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function LandlordHero({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`);
  }, []);

  return (
    <section className={s.hero}>
      <div className={s.heroPhoto} />
      <div className={s.heroInner}>
        <div className={s.heroText}>
          <div className={s.heroEyebrow}>Landlord Workspace · 자산 관리</div>
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
            <Link href={LANDLORD_ROUTES.listingNew} className={s.heroCta}>
              <Plus size={18} strokeWidth={2.4} /> 신규 매물 등록
            </Link>
            <div className={s.heroSubLinks}>
              <Link href={LANDLORD_ROUTES.listings}>매물 목록</Link>
              <Link href={LANDLORD_ROUTES.monitoring}>등기감시</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
