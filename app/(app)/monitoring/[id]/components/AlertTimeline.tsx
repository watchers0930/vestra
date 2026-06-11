"use client";

import { CheckCircle, FileSearch, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import type { AlertItem } from "../hooks/usePropertyDetail";

interface Props {
  alerts: AlertItem[];
  deposit: number | null;
  property: {
    id: string;
    address: string;
    commUniqueNo: string | null;
    ownerName: string | null;
  };
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

/** 금액 문자열에서 만원 단위 숫자 추출 (예: "4억 8,000만원" → 48000) */
function parseAmountFromSummary(summary: string): number | null {
  const match = summary.match(/(\d[\d,]*)억\s*(\d[\d,]*)?만/);
  if (!match) {
    const manMatch = summary.match(/(\d[\d,]*)만/);
    if (manMatch) return parseInt(manMatch[1].replace(/,/g, ""), 10);
    return null;
  }
  const eok = parseInt(match[1].replace(/,/g, ""), 10) * 10000;
  const man = match[2] ? parseInt(match[2].replace(/,/g, ""), 10) : 0;
  return eok + man;
}

function formatMan(amount: number): string {
  if (amount >= 10000) {
    const eok = Math.floor(amount / 10000);
    const man = amount % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${amount.toLocaleString()}만원`;
}

/** 알림 유형 + 맥락에 따른 위험 사유 설명 */
function getRiskExplanation(
  changeType: string,
  riskLevel: string,
  summary: string,
  deposit: number | null
): string | null {
  const alertAmount = parseAmountFromSummary(summary);

  switch (changeType) {
    case "mortgage_added": {
      if (deposit && alertAmount && alertAmount > deposit) {
        return `채권최고액(${formatMan(alertAmount)})이 보증금(${formatMan(deposit)})보다 높습니다. 경매 시 근저당권자가 먼저 변제받으므로 보증금 전액 회수가 어려울 수 있습니다.`;
      }
      if (deposit && alertAmount && alertAmount <= deposit) {
        return `채권최고액(${formatMan(alertAmount)})이 보증금(${formatMan(deposit)}) 이하이나, 추가 근저당이 설정되면 위험이 커질 수 있으므로 주의가 필요합니다.`;
      }
      return "근저당권이 설정되면 경매 시 근저당권자가 우선 변제를 받습니다. 보증금 회수에 영향을 줄 수 있으니 채권최고액을 확인하세요.";
    }
    case "mortgage_removed":
      return "근저당권이 해지되어 해당 담보 부담이 사라졌습니다. 보증금 회수 안전성이 개선된 긍정적 변동입니다.";
    case "seizure_added":
      return "재산이 압류되었습니다. 소유자의 채무 불이행을 의미하며, 강제 경매로 이어질 가능성이 높습니다. 보증금 보호 조치를 즉시 확인하세요.";
    case "seizure_removed":
      return "압류가 해제되어 법적 분쟁이 해소된 것으로 보입니다.";
    case "ownership_changed":
      return "소유자가 변경되면 기존 임대차 계약이 새 소유자에게 승계되지만, 대항력·우선변제권 요건을 갖추었는지 반드시 확인해야 합니다.";
    case "lien_added":
      return "가압류는 채권자가 법원에 재산 보전을 신청한 것입니다. 소유자에 대한 금전 분쟁이 진행 중이며, 본압류·경매로 전환될 수 있습니다.";
    case "lien_removed":
      return "가압류가 해제되어 관련 금전 분쟁이 해소된 것으로 보입니다.";
    case "provisional_registration":
      return "가등기는 향후 소유권 이전을 예약하는 등기입니다. 가등기에 기한 본등기가 이루어지면 이후 권리자(임차인 포함)의 권리가 밀려날 수 있습니다.";
    case "right_change": {
      if (riskLevel === "low" && summary.includes("전세권")) {
        return "전세권이 등기부에 설정되었습니다. 대항력과 별도로 등기부상 권리를 확보한 것으로, 보증금 보호에 유리합니다.";
      }
      return "등기부상 권리 관계에 변동이 발생했습니다. 변동 내용을 확인하여 임차인 권리에 영향이 있는지 점검하세요.";
    }
    default:
      return null;
  }
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlertTimeline({ alerts, deposit, property, onMarkRead }: Props) {
  const router = useRouter();
  const canIssueRegistry = !!property.commUniqueNo && !!property.ownerName;

  function openRegistryIssue() {
    if (!canIssueRegistry) return;
    sessionStorage.setItem(
      "vestra_registry_issue_prefill",
      JSON.stringify({
        propertyId: property.id,
        address: property.address,
        commUniqueNo: property.commUniqueNo,
        ownerName: property.ownerName,
        source: "monitoring-alert",
      })
    );
    router.push("/rights?issue=1");
  }

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
              const explanation = getRiskExplanation(alert.changeType, alert.riskLevel, alert.summary, deposit);
              const showIssueCta =
                canIssueRegistry &&
                (alert.summary.includes("처리 완료") || alert.changeType !== "case_detected");
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

                      {explanation && (
                        <div className="flex gap-1.5 mt-1.5 p-2 rounded-lg bg-[#f9fafb] border border-[#f0f0f2]">
                          <Info size={12} className="text-[#aeaeb2] flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                            {explanation}
                          </p>
                        </div>
                      )}

                      <span className="text-[11px] text-[#aeaeb2] mt-1 inline-block">
                        {formatDateTime(alert.createdAt)}
                      </span>

                      {showIssueCta && (
                        <button
                          type="button"
                          onClick={openRegistryIssue}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#1d1d1f] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#333336]"
                        >
                          <FileSearch size={12} />
                          최신 등기부 확인하기
                        </button>
                      )}
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
