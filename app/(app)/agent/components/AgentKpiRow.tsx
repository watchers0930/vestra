"use client";

import { Users, Eye, Bell, Send } from "lucide-react";
import { DashboardKpiCard } from "@/app/(app)/dashboard/components/DashboardKpiCard";
import { Skeleton } from "@/components/common/Skeleton";

interface AgentKpiRowProps {
  stats: {
    totalClients: number;
    activeProperties: number;
    recentAlerts: number;
    invitedClients: number;
  } | null;
}

export function AgentKpiRow({ stats }: AgentKpiRowProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-[140px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <DashboardKpiCard
        label="총 고객"
        value={`${stats.totalClients}명`}
        description="등록된 전체 고객 수"
        icon={Users}
        colorAccent="blue"
      />
      <DashboardKpiCard
        label="감시 물건"
        value={`${stats.activeProperties}건`}
        description="고객 물건 감시 현황"
        icon={Eye}
        colorAccent="green"
      />
      <DashboardKpiCard
        label="최근 알림"
        value={`${stats.recentAlerts}건`}
        description="최근 발생한 변동 알림"
        icon={Bell}
        colorAccent={stats.recentAlerts > 0 ? "orange" : "green"}
      />
      <DashboardKpiCard
        label="초대 중"
        value={`${stats.invitedClients}명`}
        description="초대 링크 발송 대기 고객"
        icon={Send}
        colorAccent="blue"
      />
    </div>
  );
}
