"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import { checkLogBulletColor, checkLogStatusLabel } from "./alertHelpers";
import type { CheckLogItem } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 감시 실행 내역 월간 달력.
 * 날짜별로 하루 최대 2회(정오·오후) 프리체크를 원형 블릿 색상으로 표시.
 * 시각 기준은 브라우저 로컬(대장·이용자 KST)로 그룹핑한다.
 */
export default function MonitoringActivityCalendar({ logs }: { logs: CheckLogItem[] }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // 날짜별 로그 그룹
  const byDate = new Map<string, CheckLogItem[]>();
  for (const log of logs) {
    const d = new Date(log.checkedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const prevMonth = () => setYm((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }));
  const nextMonth = () => setYm((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }));

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
          const key = `${ym.y}-${ym.m}-${day}`;
          const dayLogs = byDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div key={key} className={`${s.calCell} ${isToday ? s.calToday : ""}`}>
              <span className={s.calDay}>{day}</span>
              <div className={s.calBullets}>
                {dayLogs.slice(0, 3).map((l) => {
                  const t = new Date(l.checkedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <span
                      key={l.id}
                      className={s.calBullet}
                      style={{ background: checkLogBulletColor(l.result, l.riskLevel) }}
                      title={`${t} · ${checkLogStatusLabel(l.result, l.riskLevel)}`}
                    />
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
