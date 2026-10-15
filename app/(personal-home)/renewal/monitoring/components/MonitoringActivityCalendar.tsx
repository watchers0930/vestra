"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import { checkLogBulletColor, checkLogPillBg, checkLogStatusLabel } from "./alertHelpers";
import { kstDateKey, kstNow, kstParts } from "./kstTime";
import type { CheckLogItem } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 감시 실행 내역 월간 달력.
 * 날짜별로 하루 최대 2회(정오·오후) 프리체크를 원형 블릿 색상으로 표시.
 * 날짜 키·오늘·정오/오후 슬롯은 공통 KST 유틸로 고정한다(설계 §4.5 — 해외 기기 회귀 방지).
 *
 * 월 이동은 기본적으로 내부 상태로 처리한다(회원 화면). 비회원 조회처럼 월별로 서버에서
 * 로그를 다시 불러와야 하는 경우, year/month/onMonthChange 를 넘겨 제어형으로 쓴다(하위호환).
 */
export default function MonitoringActivityCalendar({
  logs,
  year,
  month,
  onMonthChange,
}: {
  logs: CheckLogItem[];
  /** 제어형: 표시할 연도 */
  year?: number;
  /** 제어형: 표시할 월(0-based) */
  month?: number;
  /** 제어형: 월 이동 콜백(연도, 0-based 월) */
  onMonthChange?: (year: number, month: number) => void;
}) {
  const today = kstNow(); // KST 기준 오늘
  const controlled = year != null && month != null && !!onMonthChange;
  const [internalYm, setInternalYm] = useState({ y: today.year, m: today.month - 1 });
  const ym = controlled ? { y: year as number, m: month as number } : internalYm;
  const setYm = (next: { y: number; m: number }) => {
    if (controlled) onMonthChange!(next.y, next.m);
    else setInternalYm(next);
  };

  // 날짜별 로그 그룹 (KST 기준 날짜 키)
  const byDate = new Map<string, CheckLogItem[]>();
  for (const log of logs) {
    const key = kstDateKey(log.checkedAt);
    if (!key) continue; // 잘못된 타임스탬프는 건너뜀
    const arr = byDate.get(key) || [];
    arr.push(log);
    byDate.set(key, arr);
  }
  for (const arr of byDate.values()) {
    arr.sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
  }

  const first = new Date(ym.y, ym.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // kstDateKey 와 동일 포맷(월 1-based)으로 셀/오늘 키 생성
  const todayKey = `${today.year}-${today.month}-${today.day}`;

  const prevMonth = () => setYm(ym.m === 0 ? { y: ym.y - 1, m: 11 } : { y: ym.y, m: ym.m - 1 });
  const nextMonth = () => setYm(ym.m === 11 ? { y: ym.y + 1, m: 0 } : { y: ym.y, m: ym.m + 1 });

  return (
    <div className={s.calWrap}>
      <div className={s.calHead}>
        <button className={s.calNav} onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={16} /></button>
        <span className={s.calTitle}>{ym.y}년 {ym.m + 1}월</span>
        <button className={s.calNav} onClick={nextMonth} aria-label="다음 달"><ChevronRight size={16} /></button>
      </div>

      <div className={s.calGrid}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={s.calWd}>{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className={s.calCell} />;
          const key = `${ym.y}-${ym.m + 1}-${day}`; // kstDateKey 포맷(월 1-based)
          const dayLogs = byDate.get(key) || [];
          const isToday = key === todayKey;
          // 하루 2회: 오전(정오 점검, <15시) · 오후(17시 점검, >=15시) 대표 회차 — KST 시각 기준
          const kstHour = (l: CheckLogItem) => kstParts(l.checkedAt)?.hour ?? 0;
          const am = [...dayLogs].filter((l) => kstHour(l) < 15).pop();
          const pm = [...dayLogs].filter((l) => kstHour(l) >= 15).pop();
          const slots = [am, pm].filter(Boolean) as typeof dayLogs;
          return (
            <div key={key} className={`${s.calCell} ${isToday ? s.calToday : ""}`}>
              <span className={s.calDay}>{day}</span>
              <div className={s.calSlots}>
                {slots.map((l) => {
                  const h = kstHour(l);
                  return (
                    <span
                      key={l.id}
                      className={s.calPill}
                      style={{ background: checkLogPillBg(l.result, l.riskLevel), color: checkLogBulletColor(l.result, l.riskLevel) }}
                      title={`${h}시 · ${checkLogStatusLabel(l.result, l.riskLevel)}`}
                    >
                      <i style={{ background: checkLogBulletColor(l.result, l.riskLevel) }} />
                      {h}시
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.calLegend}>
        <span className={s.calLg}><i style={{ background: "#3452c5" }} />이상 없음</span>
        <span className={s.calLg}><i style={{ background: "#f59e0b" }} />주의</span>
        <span className={s.calLg}><i style={{ background: "#f97316" }} />경고</span>
        <span className={s.calLg}><i style={{ background: "#ef4444" }} />위험</span>
        <span className={s.calLg}><i style={{ background: "#cbd5e1" }} />미실행</span>
      </div>
    </div>
  );
}
