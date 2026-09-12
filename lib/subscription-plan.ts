/**
 * 유료 플랜 판별 (순수 함수 — 클라/서버 공용, prisma 의존 없음).
 * 클라이언트 컴포넌트에서 안전하게 import 가능.
 * @module lib/subscription-plan
 */

const PAID_PLANS = ["PRO", "BUSINESS"];

/** 유료 플랜 여부. status active + PRO/BUSINESS */
export function isPaidPlan(plan?: string | null, status?: string | null): boolean {
  return !!plan && PAID_PLANS.includes(plan) && (status ?? "active") === "active";
}
