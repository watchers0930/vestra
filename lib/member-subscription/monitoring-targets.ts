import { prisma } from "@/lib/prisma";
import { effectiveEntitlement } from "./policy";
/** Thin request-time safety net over the state-based enforcement done by the
 * lifecycle cron (which pauses expired/over-limit members so the shared
 * status:active batch excludes them). This net is **fail-safe and flag-independent**:
 * the MEMBER_SUBSCRIPTION_ENABLED flag gates new ordering, never expiry enforcement,
 * so a classified member whose term lapsed is excluded even if the flag is toggled off
 * or the release config is incomplete. Legacy (unclassified pre-rollout) and
 * grandfathered owners always pass — they never acquire new restrictions.
 * Batched: at most two bounded queries, never per-property/per-owner. */
export async function filterMemberMonitoringTargets<T extends { userId: string }>(properties: T[], now = new Date()): Promise<T[]> {
  if (properties.length === 0) return properties;
  const userIds = [...new Set(properties.map(p => p.userId))];
  const [users, counts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: {
      id: true, role: true, verifyStatus: true, createdAt: true, subscription: true, membershipPolicy: true,
    } }),
    prisma.monitoredProperty.groupBy({ by: ["userId"], where: { userId: { in: userIds }, status: "active" }, _count: { _all: true } }),
  ]);
  const countByUser = new Map(counts.map(c => [c.userId, c._count._all]));
  const allowed = new Set(users.filter(user => {
    // Unclassified owners are never restricted by the member filter: they are either legacy
    // or not yet taken over by the member system, and registration already gates their limit.
    // Only classified, non-grandfathered members are subject to term/limit enforcement — and
    // that holds regardless of MEMBER_SUBSCRIPTION_ENABLED (the flag gates new ordering, never
    // expiry), so a lapsed member is excluded even if the flag is toggled off.
    if (!user.membershipPolicy || user.membershipPolicy.grandfatheredAt) return true;
    const e = effectiveEntitlement(user, now);
    return e.canUsePaidFeatures && (countByUser.get(user.id) ?? 0) <= e.monitoringLimit;
  }).map(user => user.id));
  return properties.filter(p => allowed.has(p.userId));
}
