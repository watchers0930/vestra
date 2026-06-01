"use client";

import { MonitoringPropertyCard } from "./MonitoringPropertyCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Eye, Filter } from "lucide-react";
import type { MonitoredProperty, StatusFilter } from "../hooks/useMonitoringData";

interface Props {
  properties: MonitoredProperty[];
  statusFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  unreadByProperty: Record<string, number>;
  highestRiskByProperty: Record<string, string>;
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "감시중" },
  { value: "paused", label: "일시중지" },
];

export function MonitoringPropertyList({
  properties,
  statusFilter,
  onFilterChange,
  unreadByProperty,
  highestRiskByProperty,
}: Props) {
  if (properties.length === 0 && statusFilter === "all") {
    return (
      <EmptyState
        icon={Eye}
        title="감시 중인 물건이 없습니다"
        description="상단의 물건 추가 버튼으로 감시를 시작하세요."
      />
    );
  }

  return (
    <div>
      {/* 필터 */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={14} className="text-[#86868b]" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
            style={{
              background: statusFilter === f.value ? "rgba(0,113,227,0.1)" : "transparent",
              color: statusFilter === f.value ? "#0071e3" : "#6e6e73",
              border: statusFilter === f.value ? "1px solid rgba(0,113,227,0.2)" : "1px solid transparent",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      {properties.length === 0 ? (
        <p className="text-center text-[13px] text-[#86868b] py-12">
          해당 상태의 물건이 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <MonitoringPropertyCard
              key={p.id}
              property={p}
              unreadCount={unreadByProperty[p.id] || 0}
              highestRisk={highestRiskByProperty[p.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
