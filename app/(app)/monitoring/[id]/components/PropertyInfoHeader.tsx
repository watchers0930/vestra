"use client";

import { MapPin, Calendar, Shield, Banknote, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card, CardContent } from "@/components/common/Card";
import type { PropertyDetail } from "../hooks/usePropertyDetail";

interface Props {
  property: PropertyDetail;
  monitorDays: number;
}

const MODE_LABEL: Record<string, string> = {
  standard: "일반 감시",
  contract_gap: "계약갭 강화감시",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PropertyInfoHeader({ property, monitorDays }: Props) {
  return (
    <Card>
      <CardContent className="px-5 pt-4 pb-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* 좌측: 물건 정보 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <MapPin size={16} className="text-[#0071e3] flex-shrink-0" />
              <h2 className="text-[16px] font-bold text-[#1d1d1f] leading-tight">
                {property.address}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={property.status === "active" ? "success" : "neutral"}>
                {property.status === "active" ? "감시중" : "일시중지"}
              </Badge>
              <Badge variant="info">
                {MODE_LABEL[property.monitorMode] || property.monitorMode}
              </Badge>
              {!property.commUniqueNo && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ background: "rgba(255,159,10,0.12)", color: "#b86f00" }}
                  title="공식 등기 연계 없이 PDF로 직접 등록된 물건입니다. 원본 진위가 검증되지 않았습니다."
                >
                  <AlertTriangle size={10} />
                  원본 미검증
                </span>
              )}
              <span className="text-[11.5px] text-[#86868b]">
                감시 {monitorDays}일째
              </span>
            </div>

            {/* 상세 정보 */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-[#6e6e73]">
              {property.deposit && (
                <div className="flex items-center gap-1.5">
                  <Banknote size={13} />
                  <span>보증금 {property.deposit.toLocaleString()}만원</span>
                </div>
              )}
              {property.contractDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>계약일 {formatDate(property.contractDate)}</span>
                </div>
              )}
              {property.moveInDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>전입 예정 {formatDate(property.moveInDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 요약 수치 */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <div className="text-center">
              <div className="text-[22px] font-bold text-[#1d1d1f]">{property.snapshotCount}</div>
              <div className="text-[11px] text-[#86868b]">스냅샷</div>
            </div>
            <div className="w-px h-8 bg-[#e5e5e7]" />
            <div className="text-center">
              <div className="text-[22px] font-bold text-[#1d1d1f]">
                {property.alerts.filter((a) => !a.isRead).length}
              </div>
              <div className="text-[11px] text-[#86868b]">미확인 알림</div>
            </div>
            <div className="w-px h-8 bg-[#e5e5e7]" />
            <div className="flex items-center gap-1.5">
              <Shield size={16} className="text-[#30d158]" />
              <span className="text-[12px] font-medium text-[#30d158]">보호중</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
