"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import g from "../../guest/guest.module.css";
import { GUEST_STATUS_PATH } from "../../guest/guestProvider";
import type { GuestOrderStateResponse } from "@/types/guest-monitoring";

// 감시 시작/만료 일시는 KST 기준 표기(설계 §4.5)
function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 신청 완료 화면 (설계 §4.1-8).
 * 접수 결과·시작/만료 일시·현황 조회 링크 제공. 완료 화면만으로 달력 접근권은 부여하지 않으므로,
 * 조회는 반드시 본인인증을 거치는 현황 조회 화면으로 안내한다.
 */
export default function GuestApplyResult({ order }: { order: GuestOrderStateResponse }) {
  return (
    <div className={`${g.card} ${g.resultWrap}`}>
      <div className={g.resultIcon}>
        <CheckCircle2 size={34} />
      </div>
      <p className={g.resultTitle}>등기감시 신청이 완료되었습니다</p>
      <p className={g.resultDesc}>
        결제가 확인되어 감시가 시작되었습니다. 하루 2회 등기신청사건을 점검하며,
        만료 시 연장 결제 안내 문자를 보내드립니다.
      </p>

      <div className={g.periodBox}>
        <div className={g.periodItem}>
          <div className={g.periodLabel}>감시 시작</div>
          <div className={g.periodVal}>{formatDateTime(order.startedAt)}</div>
        </div>
        <div className={g.periodItem}>
          <div className={g.periodLabel}>만료 예정</div>
          <div className={g.periodVal}>{formatDateTime(order.paidUntil)}</div>
        </div>
      </div>

      <p className={g.resultDesc} style={{ fontSize: 12.5, color: "#8a8fa3" }}>
        감시 기록은 아래 현황 조회에서 휴대폰 본인인증 후 확인하실 수 있습니다.
        이 화면의 링크만으로는 달력을 열 수 없습니다.
      </p>

      <div className={g.btnRow}>
        <Link href={GUEST_STATUS_PATH} className={g.btnGhost}>
          감시 현황 조회하기
        </Link>
      </div>
    </div>
  );
}
