"use client";

import { useState } from "react";
import { Activity, Plus, Radar } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
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
        <div className="pb-20 pt-[52px]">
          <CategoryHero
            badge="🔎 등기감시"
            title="등기부 변동 실시간 감시"
            description={<>등기부등본 변동을 실시간으로 감시하고<br />무결성 검증 증명서를 발급합니다.</>}
          />
          <MonitoringSkeleton />
        </div>
      </div>
    );
  }

  return (
    <AuthGuard featureName="등기감시">
    <div>
      <DashboardPageTopbar current="등기감시" primaryHref="/monitoring" primaryLabel="물건 추가" />
      <div className="pb-20 pt-[52px]">
        <CategoryHero
          badge="🔎 등기감시"
          title="등기부 변동 실시간 감시"
          description={<>등록한 부동산의 권리 변동을 추적하고<br />위험 알림과 무결성 검증 증명서를 관리합니다.</>}
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
        />

      <div className="space-y-8">
        {activeCount > 0 && (
          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-[0_1px_12px_rgba(48,209,88,0.08)]">
            <div className="h-[2px] bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400" />
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <span className="absolute h-10 w-10 animate-ping rounded-full bg-emerald-300/30" />
                  <Radar size={18} className="relative" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1d1d1f]">등기감시 엔진 작동 중</p>
                  <p className="mt-0.5 text-[12px] text-[#6e6e73]">
                    활성 물건 {activeCount}건을 4시간 주기로 프리체크하고, 이상징후 발생 시 확정 조회로 전환합니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                  <Activity size={13} />
                  신청사건 프리체크 활성
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700">
                  확정조회 대기
                </span>
              </div>
            </div>
          </div>
        )}

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
