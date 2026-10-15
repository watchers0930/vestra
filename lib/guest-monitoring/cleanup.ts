import { prisma } from "@/lib/prisma";
import { locked } from "./transaction";
export async function cleanupGuestData(now: Date) {
  await prisma.guestMonitoringOrder.updateMany({ where: { status: "pending", expiresAt: { lte: now } }, data: { status: "failed" } });
  const drafts = await prisma.guestMonitoring.findMany({ where: {
    status: { in: ["pending_payment", "abandoned"] }, draftExpiresAt: { lte: now },
    orders: { none: { status: { in: ["paid", "pending", "needs_review"] } } },
  }, select: { id: true, guestIdentityHash: true }, take: 100 });
  for (const draft of drafts) await locked(draft.guestIdentityHash, async tx => {
    // Retain order audit records, but scrub abandoned draft PII.
    await tx.guestMonitoring.updateMany({ where: { id: draft.id, status: { in: ["pending_payment", "abandoned"] },
      orders: { none: { status: { in: ["paid", "pending", "needs_review"] } } } }, data: {
      status: "abandoned", guestName: "삭제됨", guestPhone: "삭제됨", address: "삭제됨", ownerName: null,
      commUniqueNo: null, guestIdentityHash: `abandoned:${draft.id}`, draftExpiresAt: null,
    } });
  });
  await prisma.guestVerificationSession.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.guestMonitoringCheckLog.deleteMany({ where: { checkedAt: { lt: new Date(now.getTime() - 90 * 86400_000) } } });
  return drafts.length;
}
