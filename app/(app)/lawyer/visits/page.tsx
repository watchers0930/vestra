"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "../hooks/useLawyerDashboard";
import { ConsultCalendar, dayKey } from "../components/ConsultCalendar";
import { VisitDayPanel } from "../components/VisitDayPanel";

/** 방문예약 — 공동 캘린더(상담·방문 색 구분) + 날짜별 방문 예약 확정 */
export default function LawyerVisitsPage() {
  const d = useLawyerDashboard(false, true, true);
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  return (
    <div>
      <DashboardPageTopbar current="방문예약" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={CalendarCheck} title="방문예약" description="사무실 방문 예약을 날짜별로 확인하고 확정합니다." />
        {d.loading ? (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 mt-2 items-start">
            <div className="w-full lg:w-[300px] lg:flex-shrink-0">
              <ConsultCalendar consults={d.consults} visits={d.visits} selected={selected} onSelect={setSelected} />
            </div>
            <div className="w-full lg:flex-1 min-w-0">
              <VisitDayPanel dateKey={selected} visits={d.visits} busy={d.busy} onConfirm={d.confirmVisit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
