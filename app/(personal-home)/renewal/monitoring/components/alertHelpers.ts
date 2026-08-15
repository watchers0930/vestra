import { AlertTriangle, Landmark, ClipboardList, Home, FileClock, ShieldQuestion, type LucideIcon } from "lucide-react";

export const CHANGE_TYPE_LABEL: Record<string, string> = {
  mortgage_added: "근저당권 설정",
  mortgage_removed: "근저당 해지",
  seizure_added: "압류 설정",
  seizure_removed: "압류 해제",
  ownership_changed: "소유권 변동",
  lien_added: "가압류 설정",
  lien_removed: "가압류 해제",
  provisional_registration: "가등기 설정",
  right_change: "권리 변동",
  case_detected: "신청사건 접수",
  baseline_set: "최초 기록",
};

export const RISK_LABEL: Record<string, string> = {
  critical: "위험",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/** 위험도 → 시안 아이콘 배경 클래스 접미사 (aiIco*) */
export const RISK_ICO_SUFFIX: Record<string, string> = {
  critical: "aiIcoCritical",
  high: "aiIcoHigh",
  medium: "aiIcoMedium",
  low: "aiIcoLow",
};

/** 위험도 → 시안 위험 배지 클래스 접미사 (air*) */
export const RISK_BADGE_SUFFIX: Record<string, string> = {
  critical: "airCritical",
  high: "airHigh",
  medium: "airMedium",
  low: "airLow",
};

/** 변동 유형별 아이콘 */
export function changeTypeIcon(changeType: string): LucideIcon {
  switch (changeType) {
    case "seizure_added":
    case "seizure_removed":
    case "lien_added":
    case "lien_removed":
      return AlertTriangle;
    case "mortgage_added":
    case "mortgage_removed":
      return Landmark;
    case "ownership_changed":
      return Home;
    case "case_detected":
      return ClipboardList;
    case "provisional_registration":
      return FileClock;
    default:
      return ShieldQuestion;
  }
}

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

/** 알림 유형 + 맥락에 따른 위험 사유 설명 (기존 AlertTimeline 로직 재현) */
export function getRiskExplanation(
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

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.$/, "");
}

/** 스냅샷 섹션 라벨 */
export const SECTION_LABEL: Record<string, string> = {
  title: "표제부",
  exclusive: "전유부분",
  gapgu: "갑구",
  eulgu: "을구",
};

export function truncHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash || "";
  return `${hash.slice(0, 8)}···${hash.slice(-8)}`;
}
