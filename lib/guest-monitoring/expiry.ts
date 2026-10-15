import { prisma } from "@/lib/prisma";
import { locked } from "./transaction";
import { recoverPayments } from "./recovery";
import { deliverOutbox } from "./outbox";
import { cleanupGuestData } from "./cleanup";
/** Bounded sweeps; conditional updates never overwrite a newer paidUntil. */
async function expireProperties(now: Date) {
  const expired = await prisma.guestMonitoring.findMany({ where: {
    status: "active", paidUntil: { lte: now },
  }, select: { id: true, guestIdentityHash: true }, take: 100, orderBy: { paidUntil: "asc" } });
  for (const ref of expired) await locked(ref.guestIdentityHash, async tx => {
    const property = await tx.guestMonitoring.findFirst({ where: {
      id: ref.id, status: "active", paidUntil: { lte: now },
    }, select: { paidUntil: true } });
    if (!property?.paidUntil) return;
    await tx.guestMonitoring.update({ where: { id: ref.id }, data: { status: "expired" } });
    await tx.guestMonitoringMessage.upsert({ where: { guestMonitoringId_type_targetPaidUntil: {
      guestMonitoringId: ref.id, type: "expiry_notice", targetPaidUntil: property.paidUntil,
    } }, create: { guestMonitoringId: ref.id, type: "expiry_notice", targetPaidUntil: property.paidUntil,
      nextAttemptAt: now }, update: {} });
  });
  return expired.length;
}
export async function runGuestLifecycle(now = new Date()) {
  // Recover first so already-paid renewals do not trigger stale expiry notices.
  const recovered = await recoverPayments();
  const expired = await expireProperties(now);
  const sent = await deliverOutbox(now);
  const abandoned = await cleanupGuestData(now);
  return { expired, sent, recovered, abandoned };
}
