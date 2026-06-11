"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle, ChevronRight, Radar, ShieldCheck, Zap, FileSearch } from "lucide-react";
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

function isRecentlyCreated(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000;
}

function signalLabel(status?: string | null): string {
  switch (status) {
    case "case_detected":
      return "신청사건 감지";
    case "pending_confirm":
      return "확정조회 대기";
    case "confirmed_changed":
      return "변경 확인";
    case "confirmed_no_change":
      return "변경 없음";
    case "dismissed":
      return "종결 확인";
    default:
      return "프리체크 대기";
  }
}

function signalPhase(property: MonitoredProperty): {
  label: string;
  className: string;
} | null {
  const status = property.registrySignalStatus || "idle";
  const summary = property.registrySignalSummary || "";

  if (status === "pending_confirm" || summary.includes("처리 완료")) {
    return {
      label: "처리 완료",
      className: "bg-violet-50 text-violet-700",
    };
  }
  if (summary.includes("처리 중")) {
    return {
      label: "처리 중",
      className: "bg-amber-50 text-amber-700",
    };
  }
  if (status === "case_detected" || summary.includes("접수")) {
    return {
      label: "접수",
      className: "bg-blue-50 text-blue-700",
    };
  }
  if (status === "dismissed") {
    return {
      label: "종결",
      className: "bg-slate-100 text-slate-600",
    };
  }
  return null;
}

export function MonitoringPropertyCard({ property, unreadCount, highestRisk }: Props) {
  const router = useRouter();
  const isActive = property.status === "active";
  const recent = isRecentlyCreated(property.createdAt);
  const signalStatus = property.registrySignalStatus || "idle";
  const phase = signalPhase(property);
  const isCompletedSignal =
    signalStatus === "pending_confirm" ||
    signalStatus === "confirmed_changed" ||
    (property.registrySignalSummary || "").includes("처리 완료");
  const showIssueCta =
    isActive &&
    property.commUniqueNo &&
    property.ownerName &&
    isCompletedSignal;

  function openRegistryIssue(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem(
      "vestra_registry_issue_prefill",
      JSON.stringify({
        propertyId: property.id,
        address: property.address,
        commUniqueNo: property.commUniqueNo,
        ownerName: property.ownerName,
        source: "monitoring",
      })
    );
    router.push("/rights?issue=1");
  }

  return (
    <Link href={`/monitoring/${property.id}`} className="block group">
      <Card
        hover
        className={[
          "relative overflow-hidden transition-all duration-200 group-hover:-translate-y-[2px] group-hover:shadow-lg",
          isActive ? "border-emerald-100 shadow-[0_1px_16px_rgba(48,209,88,0.08)]" : "",
          recent ? "ring-2 ring-emerald-200/80" : "",
        ].join(" ")}
      >
        {/* 상태 인디케이터 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{
            background: property.status === "active"
              ? "linear-gradient(180deg, #30d158, #34d399)"
              : "linear-gradient(180deg, #6e6e73, #8e8e93)",
          }}
        />
        {isActive && (
          <>
            <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-emerald-50">
              <div className="h-full w-1/2 animate-[scan-line_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            </div>
            <style jsx>{`
              @keyframes scan-line {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(220%); }
              }
            `}</style>
          </>
        )}

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
            <Badge variant={isActive ? "success" : "neutral"} size="sm" className={isActive ? "gap-1.5" : ""}>
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
              {isActive ? "감시 활성" : "일시중지"}
            </Badge>
          </div>

          {/* 감시 모드 + 실행 단계 */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#6e6e73] font-medium">
              {MODE_LABEL[property.monitorMode] || property.monitorMode}
            </span>
            {isActive && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <Radar size={11} />
                  하루 2회
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  <ShieldCheck size={11} />
                  {signalLabel(signalStatus)}
                </span>
                {phase && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${phase.className}`}>
                    {phase.label}
                  </span>
                )}
              </>
            )}
            {recent && isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[11px] font-semibold text-white">
                <Zap size={11} />
                방금 등록
              </span>
            )}
          </div>

          {isActive && (
            <div className="mb-4 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-emerald-800">등기감시 엔진 작동 중</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#5f6368]">
                    프리체크 후 이상징후 발생 시 최신 등기부 확정조회
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-[#86868b]">점검 주기</p>
                  <p className="text-[11px] font-semibold text-[#1d1d1f]">하루 2회</p>
                </div>
              </div>
            </div>
          )}

          {showIssueCta && (
            <button
              type="button"
              onClick={openRegistryIssue}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d1d1f] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#333336]"
            >
              <FileSearch size={14} />
              최신 등기부 확인하기
            </button>
          )}

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
