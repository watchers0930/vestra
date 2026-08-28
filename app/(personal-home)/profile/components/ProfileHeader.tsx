"use client";

import { Check } from "lucide-react";
import { ROLE_INFO } from "./profileConstants";
import type { UsageData } from "../hooks/useProfileData";
import s from "../profile-renewal.module.css";

interface Props {
  name: string;
  email: string;
  role: string;
  verifyStatus?: string;
  usage: UsageData | null;
}

/** 마이페이지 상단 개인화 헤더(서브 히어로) — 아바타·이름·등급·인증·사용량 */
export default function ProfileHeader({ name, email, role, verifyStatus, usage }: Props) {
  const roleLabel = ROLE_INFO[role]?.label ?? "개인";
  const initial = (name || "회").charAt(0);
  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? ROLE_INFO[role]?.limit ?? 5;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const verified = verifyStatus === "verified";
  const pending = verifyStatus === "pending";

  return (
    <header className={s.phead}>
      <span className={s.pheadChip}>MY PAGE</span>
      <div className={s.pheadMain}>
        <div className={s.pheadAvatar}>{initial}</div>
        <div className={s.pinfo}>
          <div className={s.pname}>{name || "회원"}<span className={s.pnameSuf}>님</span></div>
          {email && <div className={s.pmail}>{email}</div>}
          <div className={s.pbadges}>
            <span className={`${s.hpill} ${s.hpillRole}`}>{roleLabel} 회원</span>
            {verified && (
              <span className={`${s.hpill} ${s.hpillOk}`}><Check size={12} strokeWidth={2.6} /> 인증 완료</span>
            )}
            {pending && <span className={`${s.hpill} ${s.hpillWarn}`}>인증 심사 중</span>}
          </div>
        </div>
        <div className={s.husage}>
          <div className={s.husageTop}><span>오늘 사용량</span><span><b>{used}</b> / {limit}</span></div>
          <div className={s.husageTrack}><div className={s.husageFill} style={{ width: `${pct}%` }} /></div>
          <div className={s.husageSub}>{roleLabel} 회원 · 매일 자정 초기화</div>
        </div>
      </div>
    </header>
  );
}
