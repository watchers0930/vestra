/**
 * 유료 회원(구독) 판별 — 서버 전용 (prisma 조회).
 * 순수 판별 함수(isPaidPlan)는 lib/subscription-plan.ts에 분리(클라 안전).
 * @module lib/subscription-guard
 */

import { prisma } from "@/lib/prisma";
import { isPaidPlan } from "@/lib/subscription-plan";

/** 서버: userId로 유료 회원 여부 판별. ADMIN은 예외 허용. */
export async function isPaidMember(userId: string, role?: string | null): Promise<boolean> {
  if (role === "ADMIN") return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  return isPaidPlan(sub?.plan, sub?.status);
}
