import type { DurationMonths, MemberPlan, MemberRole, MemberSubscriptionStatus } from "@/types/member-subscription";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveEntitlement } from "./policy";
import { ROLE_ALLOWED_PLANS } from "./pricing";
import { memberReleaseConfig } from "./config";
export async function memberSubscriptionStatus(userId: string): Promise<MemberSubscriptionStatus> {
  const e = await resolveEffectiveEntitlement(userId);
  const [used, orders, paidTrial] = await Promise.all([
    prisma.monitoredProperty.count({ where: { userId, status: "active" } }),
    prisma.subscriptionOrder.findMany({ where: { userId, status: "paid", appliedAt: { not: null } },
      orderBy: { paidAt: "desc" }, take: 10, select: { orderId: true, plan: true, durationMonths: true,
        amount: true, paidAt: true, payment: { select: { receiptUrl: true } } } }),
    prisma.subscriptionOrder.findFirst({ where: { userId, productKind: "paid_trial", status: { in: ["paid", "refunded", "needs_review"] } }, select: { id: true } }),
  ]);
  let release: ReturnType<typeof memberReleaseConfig> | null = null;
  try { release = memberReleaseConfig(); } catch { /* Unreleased status remains readable. */ }
  const enabled = !!release;
  const newUnclassified = !e.policy && !!release && e.user.createdAt >= release.effectiveAt;
  const sub = e.user.subscription;
  const role = e.role as MemberSubscriptionStatus["role"];
  const roleAllowed = Object.prototype.hasOwnProperty.call(ROLE_ALLOWED_PLANS, role);
  const verified = e.role === "PERSONAL" || e.user.verifyStatus === "verified";
  const latest = orders.find(o => o.durationMonths !== 1 && roleAllowed && ROLE_ALLOWED_PLANS[role as MemberRole].includes(o.plan as MemberPlan));
  const free = e.state.status === "expired" && e.role === "PERSONAL" && !e.grandfathered;
  return { plan: free ? "FREE" : e.plan, status: e.state.status, role, isGrandfathered: e.grandfathered && !newUnclassified,
    startDate: sub?.startDate.toISOString() ?? null, endDate: sub?.endDate?.toISOString() ?? null,
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null, graceEndsAt: e.state.graceEndsAt?.toISOString() ?? null,
    lockedAt: e.state.lockedAt?.toISOString() ?? null, monitoring: { used, limit: e.monitoringLimit },
    trialEligible: enabled && roleAllowed && verified && (!!e.policy || newUnclassified) && !e.policy?.trialUsedAt && (!sub || sub.plan === "FREE"),
    paidTrialEligible: enabled && role === "PERSONAL" && !paidTrial,
    renewalCandidate: latest ? { plan: latest.plan as MemberPlan, durationMonths: latest.durationMonths as DurationMonths } : null,
    receipts: orders.filter(o => o.paidAt).map(o => ({ orderId: o.orderId, plan: o.plan as MemberPlan,
      amount: o.amount, paidAt: o.paidAt!.toISOString(), receiptUrl: o.payment?.receiptUrl ?? null })),
  };
}
