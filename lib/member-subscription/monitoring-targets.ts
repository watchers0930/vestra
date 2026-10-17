import { prisma } from "@/lib/prisma";
import { memberReleaseConfig } from "./config";
import { effectiveEntitlement } from "./policy";
import { MemberError } from "./errors";
/** Batched request-time check: cron delay, revoked verification, and over-limit
 * renewals cannot run paid monitoring. No queries per property or per owner. */
export async function filterMemberMonitoringTargets<T extends { userId: string }>(properties: T[], now = new Date()): Promise<T[]> {
  if (process.env.MEMBER_SUBSCRIPTION_ENABLED !== "true" || properties.length === 0) return properties;
  let effectiveAt: Date;
  try { ({ effectiveAt } = memberReleaseConfig()); }
  catch (error) {
    if (!(error instanceof MemberError) || error.code !== "provider_unavailable") throw error;
    console.warn("[MemberSubscription]", { event: "monitoring_release_not_ready" });
    return properties;
  }
  const userIds = [...new Set(properties.map(p => p.userId))];
  const [users, counts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: {
      id: true, role: true, verifyStatus: true, createdAt: true, subscription: true, membershipPolicy: true,
    } }),
    prisma.monitoredProperty.groupBy({ by: ["userId"], where: { userId: { in: userIds }, status: "active" }, _count: { _all: true } }),
  ]);
  const countByUser = new Map(counts.map(c => [c.userId, c._count._all]));
  const allowed = new Set(users.filter(user => {
    // Preserve all legacy batch semantics pending approved classification/backfill.
    if (!user.membershipPolicy) return user.createdAt < effectiveAt;
    const e = effectiveEntitlement(user, now);
    return e.canUsePaidFeatures && (countByUser.get(user.id) ?? 0) <= e.monitoringLimit;
  }).map(user => user.id));
  return properties.filter(p => allowed.has(p.userId));
}
