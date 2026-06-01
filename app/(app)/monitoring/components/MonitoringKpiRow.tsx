"use client";

import { Eye, Bell, AlertTriangle, ShieldCheck } from "lucide-react";
import { DashboardKpiCard } from "@/app/(app)/dashboard/components/DashboardKpiCard";

interface Props {
  activeCount: number;
  unreadAlertCount: number;
  highRiskCount: number;
  totalCount: number;
}

export function MonitoringKpiRow({ activeCount, unreadAlertCount, highRiskCount, totalCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <DashboardKpiCard
        label="감시 중"
        value={`${activeCount}건`}
        description={`전체 ${totalCount}건 중 활성 감시`}
        icon={Eye}
        colorAccent="blue"
      />
      <DashboardKpiCard
        label="미확인 알림"
        value={`${unreadAlertCount}건`}
        description="확인하지 않은 변동 알림"
        icon={Bell}
        colorAccent={unreadAlertCount > 0 ? "orange" : "green"}
      />
      <DashboardKpiCard
        label="고위험 알림"
        value={`${highRiskCount}건`}
        description="즉시 확인이 필요한 알림"
        icon={AlertTriangle}
        colorAccent={highRiskCount > 0 ? "red" : "green"}
      />
      <DashboardKpiCard
        label="기록 보호"
        value="위변조 방지"
        description="모든 기록을 암호화로 안전하게 보관"
        icon={ShieldCheck}
        colorAccent="green"
      />
    </div>
  );
}
