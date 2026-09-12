/**
 * 유료 회원(구독) 판별 유틸.
 * 유료 = 구독 plan이 PRO/BUSINESS 이고 status가 active. ADMIN은 예외로 허용.
 * @module lib/subscription-guard
 */

import { prisma } from "@/lib/prisma";

const PAID_PLANS = ["PRO", "BUSINESS"];

/** 유료 플랜 여부 (순수 함수 — 클라/서버 공용). */
export function isPaidPlan(plan?: string | null, status?: string | null): boolean {
  return !!plan && PAID_PLANS.includes(plan) && (status ?? "active") === "active";
}

/** 서버: userId로 유료 회원 여부 판별. ADMIN은 예외 허용. */
export async function isPaidMember(userId: string, role?: string | null): Promise<boolean> {
  if (role === "ADMIN") return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  return isPaidPlan(sub?.plan, sub?.status);
}
