import { isPaidMember as legacyPaid, getMonitoringLimit as legacyLimit } from "@/lib/subscription-guard";
import { resolveEffectiveEntitlement } from "./policy";
import { memberTransaction, type MemberTransaction } from "./transaction";
import { fail } from "./errors";
export async function isPaidMember(userId: string, role?: string | null) {
  if (process.env.MEMBER_SUBSCRIPTION_ENABLED !== "true") return legacyPaid(userId, role);
  const e = await resolveEffectiveEntitlement(userId);
  if (e.user.role === "ADMIN") return true;
  return e.canUsePaidFeatures;
}
export async function getMonitoringLimit(userId: string, role?: string | null) {
  if (process.env.MEMBER_SUBSCRIPTION_ENABLED !== "true") return legacyLimit(userId, role);
  const e = await resolveEffectiveEntitlement(userId);
  if (e.user.role === "ADMIN") return 100;
  return e.monitoringLimit;
}
/** Prevent the old FREE/cancel routes from overwriting paid periods or business roles. */
export async function withLegacySubscriptionChange<T>(userId: string, operation: (tx: MemberTransaction) => Promise<T>) {
  return memberTransaction(userId, async tx => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, subscription: true, membershipPolicy: true } });
    if (!user) return fail("unauthorized");
    if (user.subscription?.policyVersion || (user.membershipPolicy && !user.membershipPolicy.grandfatheredAt && user.role !== "PERSONAL")) fail("forbidden");
    return operation(tx);
  });
}
/** Keep the bounded SQL candidate query a superset of entitled owners.
 * Lifecycle/role/baseline decisions belong only to filterMemberMonitoringTargets.
 * In particular, incomplete rollout config must not interrupt legacy batches. */
export function memberMonitoringFilter() {
  return {};
}
