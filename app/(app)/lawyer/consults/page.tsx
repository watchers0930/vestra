"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "../hooks/useLawyerDashboard";
import { ConsultCalendar, dayKey } from "../components/ConsultCalendar";
import { ConsultDayPanel } from "../components/ConsultDayPanel";

/** 상담신청현황 — 캘린더(날짜별 건수) + 날짜별 시간 일정 조율 */
export default function LawyerConsultsPage() {
  const d = useLawyerDashboard(false, true, true);
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  return (
    <div>
      <DashboardPageTopbar current="상담신청현황" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={CalendarDays} title="상담신청현황" description="이용자가 신청한 상담을 날짜별로 확인하고 시간을 조율합니다." />
        {d.loading ? (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 mt-2 items-start">
            <div className="w-full lg:w-[300px] lg:flex-shrink-0">
              <ConsultCalendar consults={d.consults} visits={d.visits} selected={selected} onSelect={setSelected} />
            </div>
            <div className="w-full lg:flex-1 min-w-0">
              <ConsultDayPanel dateKey={selected} consults={d.consults} busy={d.busy} onAccept={d.acceptConsult} onPropose={d.proposeConsult} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
