/**
 * 회원 구독 표시용 순수 포맷 유틸(UI 전용). 금액·할인·기간·날짜 라벨만 만든다.
 * 금액·할인 산정은 서버 SSOT가 하며 여기선 표시만 한다(§4.1). React/DOM 의존 없음.
 */

import type { DurationMonths, MemberPlan, SubStatus } from "@/types/member-subscription";

/** KRW 정수 → "95,040원" */
export function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

/** 기간 라벨: 12→"1년", 24→"2년", 그 외 "N개월" */
export function durationLabel(months: DurationMonths): string {
  if (months === 12) return "1년";
  if (months === 24) return "2년";
  return `${months}개월`;
}

/** 할인 라벨: 0이면 null, 그 외 "20% 할인" */
export function discountLabel(percent: number): string | null {
  return percent > 0 ? `${percent}% 할인` : null;
}

/** 선불 총액의 월 환산 근사치(표시용): "월 7,920원 상당" */
export function monthlyEquivalentLabel(amount: number, months: DurationMonths): string {
  return `월 ${Math.round(amount / months).toLocaleString("ko-KR")}원 상당`;
}

export function planLabel(plan: MemberPlan | "FREE"): string {
  if (plan === "FREE") return "무료";
  if (plan === "PRO") return "프로(PRO)";
  return "프리미엄(PREMIUM)";
}

/** 구독 상태 라벨·색상(표시용) */
export function statusMeta(status: SubStatus): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  switch (status) {
    case "active":
      return { label: "이용 중", tone: "success" };
    case "trialing":
      return { label: "체험 중", tone: "success" };
    case "grace":
      return { label: "유예 기간", tone: "warning" };
    case "locked":
      return { label: "기능 잠금", tone: "danger" };
    case "expired":
      return { label: "만료됨", tone: "neutral" };
    case "canceled":
      return { label: "해지됨", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
}

/** ISO → Asia/Seoul 날짜 표시(§4.7 표시 기준). 잘못된 값은 "-". */
export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}
