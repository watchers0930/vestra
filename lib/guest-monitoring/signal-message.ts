import type { TilkoCasePhase } from "@/lib/tilko-api";
import type { GuestMonitoringRole } from "@/types/guest-monitoring";

const neutral: Record<string, string> = {
  no_change: "등기신청 사건 없음 — 이상 없음",
  signal_detected: "등기신청 사건이 감지되었습니다. 최신 등기부를 확인해주세요.",
  fetch_failed: "감시 조회에 실패했습니다. 다음 주기에 재시도합니다.",
  needs_registration: "등기부 PDF를 다시 등록해주세요.",
};
const caseLabels: Record<string, string> = {
  mortgage: "근저당", ownership_transfer: "소유권이전", seizure: "압류",
};
/** Only allowlisted kinds in a completed phase can produce a specific warning. */
export function buildSignalSummary(role: GuestMonitoringRole | string | null, result: string,
  caseType?: string, phase?: TilkoCasePhase): string | null {
  if (result !== "signal_detected" || (role !== "owner" && role !== "tenant")) return Object.hasOwn(neutral, result) ? neutral[result] : null;
  const kind = phase === "completed" && caseType && Object.hasOwn(caseLabels, caseType) ? caseLabels[caseType] : undefined;
  if (kind) return role === "owner"
    ? `내 물건에 ${kind} 감지 — 무단 등기·명의도용 여부를 확인해주세요.`
    : `임대인 물건 ${kind} 감지 — 보증금 위험을 확인해주세요.`;
  return role === "owner" ? "등기신청 사건 감지 — 명의도용 여부를 확인해주세요."
    : "임대인 물건 등기신청 사건 감지 — 보증금 위험을 확인해주세요.";
}
