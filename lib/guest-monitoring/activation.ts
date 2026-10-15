import { prisma } from "@/lib/prisma";
import { GuestError } from "./errors";
import { locked } from "./transaction";
import { paidPeriod } from "./period";
import { assertDecrypted } from "./config";
export { recordPayment } from "./record-payment";
export async function applyPaidOrder(orderId: string) {
  const ref = await prisma.guestMonitoringOrder.findUniqueOrThrow({ where: { orderId },
    select: { guestMonitoring: { select: { guestIdentityHash: true } } } });
  const result = await locked(ref.guestMonitoring.guestIdentityHash, async tx => {
    const order = await tx.guestMonitoringOrder.findUniqueOrThrow({ where: { orderId } });
    if (order.appliedAt) return { applied: true };
    if (order.status === "needs_review") return { applied: false };
    if (order.status !== "paid" || !order.providerTransactionId) throw new GuestError("payment_failed");
    const property = await tx.guestMonitoring.findUniqueOrThrow({ where: { id: order.guestMonitoringId } });
    assertDecrypted(property.ownerName, property.address);
    if (!property.commUniqueNo) throw new GuestError("extraction_incomplete");
    const now = new Date();
    if (order.purpose === "initial") {
      const active = await tx.guestMonitoring.findFirst({ where: {
        id: { not: property.id }, guestIdentityHash: property.guestIdentityHash,
        commUniqueNo: property.commUniqueNo, status: "active", paidUntil: { gt: now },
      }, select: { id: true } });
      const initial = await tx.guestMonitoringOrder.findFirst({ where: {
        guestMonitoringId: property.id, purpose: "initial", appliedAt: { not: null },
      }, select: { id: true } });
      if (active || initial) {
        // Permanent conflict: commit a durable manual queue item, never auto-refund.
        await tx.guestMonitoringOrder.update({ where: { id: order.id }, data: { status: "needs_review" } });
        await tx.auditLog.create({ data: { action: "GUEST_PAYMENT_NEEDS_REVIEW", target: order.orderId,
          detail: JSON.stringify({ reason: "duplicate_active" }) } });
        return { applied: false };
      }
    }
    const { start, end } = paidPeriod(now, order.purpose === "renewal" ? property.paidUntil : null);
    // Paid order intervals define coverage; calendars exclude gaps after reactivation.
    await tx.guestMonitoring.update({ where: { id: property.id }, data: {
      status: "active", startedAt: property.startedAt || start,
      paidUntil: end, draftExpiresAt: null,
    } });
    await tx.guestMonitoringOrder.update({ where: { id: order.id }, data: {
      appliedPeriodStart: start, appliedPeriodEnd: end, appliedAt: now,
    } });
    return { applied: true };
  });
  if (!result.applied) {
    console.error("[GuestMonitoring] payment_needs_review", { orderId });
    throw new GuestError("payment_needs_review", 409);
  }
  return result;
}
export { paymentCallback } from "./payment-callback";
