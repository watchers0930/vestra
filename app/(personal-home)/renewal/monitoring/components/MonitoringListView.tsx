"use client";

import s from "../monitoring-renewal.module.css";
import MonitoringKpiRow from "./MonitoringKpiRow";
import MonitoringPropertyCard from "./MonitoringPropertyCard";
import type { MonitoredProperty, StatusFilter } from "@/app/(app)/monitoring/hooks/useMonitoringData";

interface Props {
  properties: MonitoredProperty[];
  filteredProperties: MonitoredProperty[];
  statusFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  activeCount: number;
  unreadAlertCount: number;
  highRiskCount: number;
  unreadByProperty: Record<string, number>;
  highestRiskByProperty: Record<string, string>;
  onSelect: (id: string) => void;
}

export default function MonitoringListView({
  properties,
  filteredProperties,
  statusFilter,
  onFilterChange,
  activeCount,
  unreadAlertCount,
  highRiskCount,
  unreadByProperty,
  highestRiskByProperty,
  onSelect,
}: Props) {
  const totalCount = properties.length;
  const pausedCount = totalCount - activeCount;

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `전체 ${totalCount}` },
    { key: "active", label: `감시중 ${activeCount}` },
    { key: "paused", label: `일시중지 ${pausedCount}` },
  ];

  return (
    <>
      {/* Engine Banner */}
      {activeCount > 0 && (
        <div className={s.engineBanner}>
          <div className={s.engineRadar}>
            <div className={s.engineRadarRing}></div>
            <div className={s.engineRadarRing}></div>
            <div className={s.engineRadarRing}></div>
            <div className={s.engineRadarDot}></div>
          </div>
          <div className={s.engineText}>
            <div className={s.engineT}>등기감시 엔진 작동 중</div>
            <div className={s.engineS}>
              활성 물건 {activeCount}건을 하루 2회 프리체크하고, 이상징후 발생 시 확정 조회로 전환합니다.
            </div>
          </div>
          <div className={s.engineBadges}>
            <span className={`${s.engB} ${s.engBGreen}`}>신청사건 프리체크 활성</span>
            <span className={`${s.engB} ${s.engBBlue}`}>확정조회 대기</span>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <MonitoringKpiRow
        activeCount={activeCount}
        totalCount={totalCount}
        unreadAlertCount={unreadAlertCount}
        highRiskCount={highRiskCount}
      />

      {/* Filter */}
      <div className={s.filterBar}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={`${s.filterBtn} ${statusFilter === f.key ? s.on : ""}`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Property Grid */}
      <div className={s.propGrid}>
        {filteredProperties.map((p) => (
          <MonitoringPropertyCard
            key={p.id}
            property={p}
            unreadCount={unreadByProperty[p.id] || 0}
            highestRisk={highestRiskByProperty[p.id]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}
