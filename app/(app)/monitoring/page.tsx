"use client";

import { useState } from "react";
import { AlertTriangle, Bell, Eye, Plus } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardPageHero, DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { Button } from "@/components/common/Button";
import { useMonitoringData } from "./hooks/useMonitoringData";
import { MonitoringKpiRow } from "./components/MonitoringKpiRow";
import { MonitoringPropertyList } from "./components/MonitoringPropertyList";
import { MonitoringSkeleton } from "./components/MonitoringSkeleton";
import { AddPropertyModal } from "./components/AddPropertyModal";

export default function MonitoringPage() {
  const [showAddModal, setShowAddModal] = useState(false);

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
    refresh,
  } = useMonitoringData();

  if (!mounted || loading) {
    return (
      <div>
        <DashboardPageTopbar current="등기감시" primaryHref="/monitoring" primaryLabel="물건 추가" />
        <div className="px-4 pb-20 sm:px-6 lg:px-9">
          <div className="mb-7 mt-[18px]">
            <DashboardPageHero
              eyebrow="등기감시"
              title="등기부 변동 실시간 감시"
              description="등기부등본 변동을 실시간으로 감시하고 무결성 검증 증명서를 발급합니다."
              icon={Eye}
            />
          </div>
          <MonitoringSkeleton />
        </div>
      </div>
    );
  }

  return (
    <AuthGuard featureName="등기감시">
    <div>
      <DashboardPageTopbar current="등기감시" primaryHref="/monitoring" primaryLabel="물건 추가" />
      <div className="px-4 pb-20 sm:px-6 lg:px-9">
        <div className="mb-7 mt-[18px]">
          <DashboardPageHero
            eyebrow="등기감시"
            title="등기부 변동 실시간 감시"
            description="등록한 부동산의 권리 변동을 추적하고 위험 알림과 무결성 검증 증명서를 관리합니다."
            icon={Eye}
            actions={(
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => setShowAddModal(true)}
                className="rounded-full border-0 bg-[#0071e3] px-[22px] py-[12px] text-[13.5px] font-semibold hover:bg-[#0077ed]"
              >
                물건 추가
              </Button>
            )}
            statItems={[
              { icon: Eye, label: "감시 중", value: `${activeCount}건`, valueColor: "#2997ff" },
              { icon: Bell, label: "미확인 알림", value: `${unreadAlertCount}건`, iconColor: unreadAlertCount > 0 ? "#ff9f0a" : "#30d158", valueColor: unreadAlertCount > 0 ? "#ff9f0a" : "#30d158" },
              { icon: AlertTriangle, label: "고위험", value: `${highRiskCount}건`, iconColor: highRiskCount > 0 ? "#ff3b30" : "#30d158", valueColor: highRiskCount > 0 ? "#ff3b30" : "#30d158" },
            ]}
          />
        </div>

      <div className="space-y-8">
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

      {showAddModal && (
        <AddPropertyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
          refresh();
        }}
      />
      )}
      </div>
    </div>
    </AuthGuard>
  );
}
