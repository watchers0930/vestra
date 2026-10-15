"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import s from "../../monitoring-renewal.module.css";
import g from "../../guest/guest.module.css";

interface Props {
  busy: boolean;
  error: string;
  onStart: (guestName: string, guestPhone: string) => void;
}

/**
 * 비회원 현황 조회 — 본인인증 입력 (설계 §4.2-2·3).
 * 인증 전에는 신청 존재/주소/건수/기간을 노출하지 않는다. 이름·전화 입력 후 휴대폰 본인인증만 안내한다.
 */
export default function GuestStatusAuthForm({ busy, error, onStart }: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  return (
    <div className={`${g.wrap} ${g.narrow}`}>
      <div className={g.card}>
        <div className={g.resultIcon}>
          <ShieldCheck size={30} />
        </div>
        <p className={g.cardTitle} style={{ textAlign: "center" }}>
          감시 현황 조회
        </p>
        <p className={g.cardSub} style={{ textAlign: "center" }}>
          신청하신 이름·전화번호를 입력하고 휴대폰 본인인증을 완료하면, 본인이 신청한 물건의
          감시 기록만 확인할 수 있습니다.
        </p>

        <div className={g.field}>
          <div className={s.mLabel}>이름</div>
          <input
            className={s.mInput}
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="신청 시 입력한 이름"
            disabled={busy}
          />
        </div>

        <div className={g.field}>
          <div className={s.mLabel}>전화번호</div>
          <input
            className={s.mInput}
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="예: 010-1234-5678"
            disabled={busy}
            inputMode="tel"
            autoComplete="tel"
            onKeyDown={(e) => e.key === "Enter" && !busy && onStart(guestName, guestPhone)}
          />
        </div>

        {error && <p className={g.errorText}>{error}</p>}

        <button
          className={g.btnPrimary}
          onClick={() => onStart(guestName, guestPhone)}
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? "진행 중..." : "휴대폰 본인인증"}
        </button>
      </div>
    </div>
  );
}
