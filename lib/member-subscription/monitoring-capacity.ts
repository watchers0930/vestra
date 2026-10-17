import { prisma } from "@/lib/prisma";
import { memberTransaction, type MemberTransaction } from "./transaction";
import { resolveEffectiveEntitlement } from "./policy";
import { fail } from "./errors";
export async function withMonitoringCapacity<T>(userId: string, write: (tx: MemberTransaction) => Promise<T>) {
  if (process.env.MEMBER_SUBSCRIPTION_ENABLED !== "true") return write(prisma);
  return memberTransaction(userId, async tx => {
    const e = await resolveEffectiveEntitlement(userId, new Date(), tx);
    const limit = e.user.role === "ADMIN" ? 100 : e.monitoringLimit;
    if (e.user.role !== "ADMIN" && !e.canUsePaidFeatures) fail("forbidden");
    const count = await tx.monitoredProperty.count({ where: { userId, status: "active" } });
    if (count >= limit) fail("rate_limited");
    return write(tx);
  });
}
