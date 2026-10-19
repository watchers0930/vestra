import { prisma } from "@/lib/prisma";
import { effectiveEntitlement } from "./policy";
import { memberReleaseConfig } from "./config";
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
  // Release effective date (absent when flag/config off). Used only to classify an owner that
  // has no membershipPolicy row as legacy-vs-post-release; classified members ignore it entirely.
  let effectiveAt: Date | null = null;
  try { effectiveAt = memberReleaseConfig().effectiveAt; } catch { /* release off */ }
  const allowed = new Set(users.filter(user => {
    // A real grandfather snapshot always passes — grandfathered owners never acquire new limits.
    if (user.membershipPolicy?.grandfatheredAt) return true;
    // No membershipPolicy row: legacy (release off, or created before the effective date) passes —
    // they keep current access and never acquire new restrictions. But a POST-release signup that
    // never placed a paid order also has no policy; it must NOT get a free pass here, so it falls
    // through to the entitlement check below (where no active sub → canUsePaidFeatures=false → excluded).
    if (!user.membershipPolicy && (!effectiveAt || user.createdAt < effectiveAt)) return true;
    // Classified members (and post-release unpaid signups): term/limit enforcement, flag-independent
    // (the flag gates new ordering, never expiry), so a lapsed member is excluded even when off.
    const e = effectiveEntitlement(user, now);
    return e.canUsePaidFeatures && (countByUser.get(user.id) ?? 0) <= e.monitoringLimit;
  }).map(user => user.id));
  return properties.filter(p => allowed.has(p.userId));
}
