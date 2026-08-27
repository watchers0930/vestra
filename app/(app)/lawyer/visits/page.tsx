"use client";

import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "../hooks/useLawyerDashboard";
import { VisitsTab } from "../components/VisitsTab";

/** 방문예약 */
export default function LawyerVisitsPage() {
  const d = useLawyerDashboard(false, false, true);
  return (
    <div>
      <DashboardPageTopbar current="방문예약" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={CalendarCheck} title="방문예약" description="사무실 방문 상담 예약을 확인하고 확정합니다." />
        {d.loading ? (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : (
          <VisitsTab visits={d.visits} busy={d.busy} onConfirm={d.confirmVisit} />
        )}
      </div>
    </div>
  );
}
