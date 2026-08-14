// 계약검토 결과 렌더링 공용 헬퍼 / 매핑 상수

export const SEC_IDS = ["sec-info", "sec-issues", "sec-clauses", "sec-missing", "sec-terms", "sec-checklist", "sec-report"];

// 게이지 기하 (r=40 → 둘레)
export const GAUGE_CIRC = 251.33;

// 금액 포맷 (원 단위 → 억/만원 축약)
export function formatAmount(amount?: number): string | null {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return null;
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억 원`;
  }
  if (amount >= 10000) {
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString()}만 원`;
  }
  return `${amount.toLocaleString()}원`;
}

// 안전점수 → 등급/색상/배지 클래스키
export function scoreMeta(score: number): { label: string; color: string; badgeClassKey: string } {
  if (score >= 80) return { label: "안전", color: "#22c55e", badgeClassKey: "sgbSafe" };
  if (score >= 50) return { label: "주의", color: "#f59e0b", badgeClassKey: "sgbCaution" };
  return { label: "위험", color: "#ef4444", badgeClassKey: "sgbDanger" };
}

// reviewIssue severity → 라벨/클래스키
export const severityMeta: Record<string, { label: string; dotKey: string; labelKey: string }> = {
  critical: { label: "긴급", dotKey: "sevCritical", labelKey: "sevlCritical" },
  high: { label: "중요", dotKey: "sevHigh", labelKey: "sevlHigh" },
  warning: { label: "확인", dotKey: "sevWarning", labelKey: "sevlWarning" },
  info: { label: "참고", dotKey: "sevWarning", labelKey: "sevlWarning" },
};

// 즉시 확인 카드용 클래스키
export const sumCardKey: Record<string, string> = { critical: "scCritical", high: "scHigh", warning: "scWarning", info: "scWarning" };
export const sumSevKey: Record<string, string> = { critical: "sscCritical", high: "sscHigh", warning: "sscWarning", info: "sscWarning" };

// clause riskLevel → 좌측바/배지 클래스키
export const clauseRiskMeta: Record<string, { label: string; barKey: string; badgeKey: string }> = {
  high: { label: "위험", barKey: "clbHigh", badgeKey: "crbHigh" },
  warning: { label: "주의", barKey: "clbWarning", badgeKey: "crbWarning" },
  safe: { label: "안전", barKey: "clbSafe", badgeKey: "crbSafe" },
};

// 특약 priority → 라벨/클래스키
export const termPriorityMeta: Record<string, { label: string; classKey: string }> = {
  critical: { label: "필수", classKey: "tpCritical" },
  high: { label: "권장", classKey: "tpHigh" },
  medium: { label: "선택", classKey: "tpMedium" },
};

export type Styles = Record<string, string>;
