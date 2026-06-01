"use client";

import { Eye } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useMonitoringData } from "./hooks/useMonitoringData";
import { MonitoringKpiRow } from "./components/MonitoringKpiRow";
import { MonitoringPropertyList } from "./components/MonitoringPropertyList";
import { MonitoringSkeleton } from "./components/MonitoringSkeleton";

export default function MonitoringPage() {
  const {
    mounted,
    loading,
    filteredProperties,
    properties,
    statusFilter,
    setStatusFilter,
    activeCount,
    unreadAlertCount,
    highRiskCount,
    unreadByProperty,
    highestRiskByProperty,
  } = useMonitoringData();

  if (!mounted || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <PageHeader
          icon={Eye}
          title="등기감시"
          description="등기부등본 변동을 실시간으로 감시하고 무결성 검증 증명서를 발급합니다"
        />
        <div className="mt-8">
          <MonitoringSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        icon={Eye}
        title="등기감시"
        description="등기부등본 변동을 실시간으로 감시하고 무결성 검증 증명서를 발급합니다"
      />

      <div className="mt-8 space-y-8">
        {/* KPI 카드 */}
        <MonitoringKpiRow
          activeCount={activeCount}
          unreadAlertCount={unreadAlertCount}
          highRiskCount={highRiskCount}
          totalCount={properties.length}
        />

        {/* 물건 목록 */}
        <MonitoringPropertyList
          properties={filteredProperties}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
          unreadByProperty={unreadByProperty}
          highestRiskByProperty={highestRiskByProperty}
        />
      </div>
    </div>
  );
}
