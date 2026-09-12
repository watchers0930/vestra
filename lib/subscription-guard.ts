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

/** 서버: 등기감시 등록 건수 한도 (요금제: PRO 5건 / BUSINESS 20건 / ADMIN 무제한). 무료=0. */
export async function getMonitoringLimit(userId: string, role?: string | null): Promise<number> {
  if (role === "ADMIN") return 100;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (!isPaidPlan(sub?.plan, sub?.status)) return 0;
  if (sub?.plan === "BUSINESS") return 20;
  if (sub?.plan === "PRO") return 5;
  return 0;
}
