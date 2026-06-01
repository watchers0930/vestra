"use client";

import { CheckCircle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import type { AlertItem } from "../hooks/usePropertyDetail";

interface Props {
  alerts: AlertItem[];
  onMarkRead: (id: string) => void;
}

const RISK_COLOR: Record<string, string> = {
  critical: "#ff3b30",
  high: "#ff9500",
  medium: "#ffcc00",
  low: "#30d158",
};

const RISK_LABEL: Record<string, string> = {
  critical: "위험",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  mortgage_added: "근저당 설정",
  mortgage_removed: "근저당 해지",
  seizure_added: "압류 설정",
  seizure_removed: "압류 해제",
  ownership_changed: "소유권 변동",
  lien_added: "가압류 설정",
  lien_removed: "가압류 해제",
  provisional_registration: "가등기 설정",
  right_change: "권리 변동",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlertTimeline({ alerts, onMarkRead }: Props) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader title="변동 알림" description="감시 기간 중 감지된 등기 변동 이력" className="px-5 pt-4" />
        <CardContent className="px-5 pb-5 pt-0">
          <p className="text-center text-[13px] text-[#86868b] py-8">
            감지된 변동 사항이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="변동 알림" description={`총 ${alerts.length}건의 변동 감지`} className="px-5 pt-4" />
      <CardContent className="px-5 pb-5 pt-0">
        <div className="relative">
          {/* 타임라인 세로선 */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#e5e5e7]" />

          <div className="space-y-0">
            {alerts.map((alert) => {
              const color = RISK_COLOR[alert.riskLevel] || "#6e6e73";
              return (
                <div key={alert.id} className="relative pl-8 py-3 group">
                  {/* 점 */}
                  <div
                    className="absolute left-[6px] top-[18px] w-[11px] h-[11px] rounded-full border-2 border-white"
                    style={{ background: color, boxShadow: `0 0 0 2px ${color}33` }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${color}15`, color }}
                        >
                          {RISK_LABEL[alert.riskLevel] || alert.riskLevel}
                        </span>
                        <span className="text-[12px] font-semibold text-[#1d1d1f]">
                          {CHANGE_TYPE_LABEL[alert.changeType] || alert.changeType}
                        </span>
                        {!alert.isRead && (
                          <span className="w-[6px] h-[6px] rounded-full bg-[#0071e3] flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-[12.5px] text-[#6e6e73] leading-relaxed">
                        {alert.summary}
                      </p>

                      <span className="text-[11px] text-[#aeaeb2] mt-1 inline-block">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </div>

                    {!alert.isRead && (
                      <button
                        onClick={() => onMarkRead(alert.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors opacity-0 group-hover:opacity-100"
                        title="읽음 처리"
                      >
                        <CheckCircle size={14} className="text-[#86868b]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
