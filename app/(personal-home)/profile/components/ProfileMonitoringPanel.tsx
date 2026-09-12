"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useMonitoringData } from "@/app/(app)/monitoring/hooks/useMonitoringData";
import MonitoringListView from "../../renewal/monitoring/components/MonitoringListView";
import MonitoringDetailView from "../../renewal/monitoring/components/MonitoringDetailView";

// 마이페이지 "등기감시" 탭 — 감시 결과(현황·알림) 확인 전용.
// 물건 추가/프로세스 설명은 등기감시 페이지(/renewal/monitoring)가 담당(역할 분리).
export default function ProfileMonitoringPanel({ isPaid }: { isPaid: boolean }) {
  const {
    properties,
    filteredProperties,
    loading,
    mounted,
    statusFilter,
    setStatusFilter,
    activeCount,
    unreadAlertCount,
    highRiskCount,
    unreadByProperty,
    highestRiskByProperty,
    refresh,
  } = useMonitoringData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleBack = useCallback(() => {
    setSelectedId(null);
    refresh();
  }, [refresh]);

  // 등기감시는 유료 회원 전용
  if (!isPaid) {
    return (
      <div style={{ textAlign: "center", padding: "56px 20px", color: "#6e6e73" }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1d1d1f" }}>등기감시는 유료 회원 전용입니다</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          PRO·BUSINESS 구독 회원만 등기부 변동 감시를 이용할 수 있습니다.<br />구독하시면 하루 2회 자동 감시와 변동 알림을 받아보실 수 있습니다.
        </p>
        <Link
          href="/profile?tab=tier"
          style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          구독 업그레이드
        </Link>
      </div>
    );
  }

  if (selectedId) {
    return <MonitoringDetailView propertyId={selectedId} onBack={handleBack} />;
  }

  if (!mounted || loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>불러오는 중...</div>;
  }

  if (properties.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "56px 20px", color: "#6e6e73" }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1d1d1f" }}>감시 중인 등기부가 없습니다</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          등기감시에서 내 부동산 등기부를 등록하면<br />등기 변동을 하루 2회 자동으로 감시합니다.
        </p>
        <Link
          href="/renewal/monitoring"
          style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          등기감시에서 물건 등록하기
        </Link>
      </div>
    );
  }

  return (
    <MonitoringListView
      properties={properties}
      filteredProperties={filteredProperties}
      statusFilter={statusFilter}
      onFilterChange={setStatusFilter}
      activeCount={activeCount}
      unreadAlertCount={unreadAlertCount}
      highRiskCount={highRiskCount}
      unreadByProperty={unreadByProperty}
      highestRiskByProperty={highestRiskByProperty}
      onSelect={handleSelect}
    />
  );
}
