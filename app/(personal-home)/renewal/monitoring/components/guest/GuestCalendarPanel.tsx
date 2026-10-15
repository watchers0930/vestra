"use client";

import { ChevronLeft } from "lucide-react";
import g from "../../guest/guest.module.css";
import MonitoringActivityCalendar from "../MonitoringActivityCalendar";
import type { GuestPropertyDto, CheckLogItem } from "@/types/guest-monitoring";

// 이용기간은 KST 기준으로 표기(해외 기기에서 하루 밀림 방지, §4.5).
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface Props {
  property: GuestPropertyDto;
  logs: CheckLogItem[];
  month: string; // YYYY-MM
  busy: boolean;
  error?: string;
  showBack: boolean;
  onMonthChange: (month: string) => void;
  onRenew: () => void;
  onBack: () => void;
}

/**
 * 비회원 달력 패널 (설계 §4.2-5 / step 8 연장).
 * 최소 식별 정보 + MonitoringActivityCalendar(감시 실행내역) + 연장 버튼만 제공.
 * 월 이동 시 서버에서 해당 월 로그를 다시 불러온다(제어형).
 */
export default function GuestCalendarPanel({
  property,
  logs,
  month,
  busy,
  error,
  showBack,
  onMonthChange,
  onRenew,
  onBack,
}: Props) {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;

  const handleMonthChange = (y: number, m: number) => {
    onMonthChange(`${y}-${String(m + 1).padStart(2, "0")}`);
  };

  const active = property.status === "active";

  return (
    <div className={g.card}>
      {showBack && (
        <button className={g.linkBtn} onClick={onBack} style={{ marginBottom: 12 }}>
          <ChevronLeft size={13} style={{ verticalAlign: "-2px" }} /> 다른 물건 선택
        </button>
      )}

      <div className={g.statusHead}>
        <div>
          <div className={g.statusAddr}>{property.addressShort}</div>
          <div className={g.statusMeta}>
            {fmtDate(property.startedAt)} ~ {fmtDate(property.paidUntil)}
          </div>
        </div>
        <span className={active ? g.badgeActive : g.badgeExpired}>
          {active ? "감시 중" : "만료"}
        </span>
      </div>

      <MonitoringActivityCalendar
        logs={logs}
        year={year}
        month={monthIdx}
        onMonthChange={handleMonthChange}
      />

      {error && (
        <p className={g.errorText} role="alert" aria-live="assertive" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className={g.btnRow} style={{ marginTop: 18 }}>
        <button className={g.btnPrimary} style={{ maxWidth: 280 }} onClick={onRenew} disabled={busy}>
          {busy ? "진행 중..." : active ? "1개월 연장하기 (10,000원)" : "다시 감시 시작 (10,000원)"}
        </button>
      </div>
      <p className={g.sectionSub} style={{ marginTop: 10, fontSize: 12 }}>
        {active
          ? "연장 결제가 완료되면 현재 만료일부터 1개월이 추가됩니다."
          : "결제가 완료되면 결제 시점부터 1개월간 다시 감시합니다."}
      </p>
    </div>
  );
}
