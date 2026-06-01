"use client";

import Link from "next/link";
import { Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import type { MonitoredProperty } from "../hooks/useMonitoringData";

interface Props {
  property: MonitoredProperty;
  unreadCount: number;
  highestRisk?: string;
}

const MODE_LABEL: Record<string, string> = {
  standard: "일반 감시",
  contract_gap: "계약갭 강화감시",
};

const RISK_VARIANT: Record<string, "danger" | "warning" | "success" | "info"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "success",
};

const RISK_LABEL: Record<string, string> = {
  critical: "위험",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "미확인";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function MonitoringPropertyCard({ property, unreadCount, highestRisk }: Props) {
  return (
    <Link href={`/monitoring/${property.id}`} className="block group">
      <Card hover className="relative overflow-hidden transition-all duration-200 group-hover:-translate-y-[2px] group-hover:shadow-lg">
        {/* 상태 인디케이터 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{
            background: property.status === "active"
              ? "linear-gradient(180deg, #30d158, #34d399)"
              : "linear-gradient(180deg, #6e6e73, #8e8e93)",
          }}
        />

        <div className="p-5 pl-6">
          {/* 헤더: 주소 + 배지 */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate leading-tight">
                {property.address}
              </h3>
              {property.deposit && (
                <p className="text-[12px] text-[#6e6e73] mt-1">
                  보증금 {(property.deposit / 10000).toLocaleString()}억{property.deposit % 10000 > 0 ? ` ${(property.deposit % 10000).toLocaleString()}만` : ""}원
                </p>
              )}
            </div>
            <Badge variant={property.status === "active" ? "success" : "neutral"} size="sm">
              {property.status === "active" ? "감시중" : "일시중지"}
            </Badge>
          </div>

          {/* 감시 모드 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#6e6e73] font-medium">
              {MODE_LABEL[property.monitorMode] || property.monitorMode}
            </span>
          </div>

          {/* 하단: 미확인 알림 + 최종 점검 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-[#ff9f0a]" />
                  <span className="text-[12px] font-semibold text-[#ff9f0a]">
                    {unreadCount}건
                  </span>
                  {highestRisk && (
                    <Badge variant={RISK_VARIANT[highestRisk] || "info"} size="sm">
                      {RISK_LABEL[highestRisk] || highestRisk}
                    </Badge>
                  )}
                </div>
              )}
              {unreadCount === 0 && (
                <span className="text-[12px] text-[#86868b]">알림 없음</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
              <Clock size={12} />
              <span>{formatRelativeTime(property.lastCheckedAt)}</span>
              <ChevronRight size={14} className="text-[#c7c7cc] group-hover:text-[#0071e3] transition-colors" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
