"use client";

import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "../hooks/useLawyerDashboard";
import { ConsultsTab } from "../components/ConsultsTab";

/** 상담문의 */
export default function LawyerConsultsPage() {
  const d = useLawyerDashboard(false, true, false);
  return (
    <div>
      <DashboardPageTopbar current="상담문의" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={MessageSquare} title="상담문의" description="이용자가 신청한 상담문의를 확인합니다." />
        {d.loading ? (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : (
          <ConsultsTab consults={d.consults} />
        )}
      </div>
    </div>
  );
}
