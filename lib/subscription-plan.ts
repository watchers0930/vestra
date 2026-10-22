/**
 * 유료 플랜 판별 (순수 함수 — 클라/서버 공용, prisma 의존 없음).
 * 클라이언트 컴포넌트에서 안전하게 import 가능.
 * @module lib/subscription-plan
 */

// 유료 등급: PRO / PREMIUM (정본). BUSINESS는 레거시 구독 호환(과거 데이터 안전망).
const PAID_PLANS = ["PRO", "PREMIUM", "BUSINESS"];

/** 유료 플랜 여부. status active + PRO/PREMIUM(레거시 BUSINESS 호환) */
export function isPaidPlan(plan?: string | null, status?: string | null): boolean {
  return !!plan && PAID_PLANS.includes(plan) && (status ?? "active") === "active";
}
