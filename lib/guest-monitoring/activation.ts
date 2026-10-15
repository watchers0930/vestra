import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import type { PaymentResult } from "@/lib/danal/types";
import { GuestError } from "./errors";
import { locked } from "./transaction";
import { paidPeriod } from "./period";
import { assertDecrypted } from "./config";
import { guestLimit } from "./rate-limit-keys";
/** Persist verified payment first so a subsequent apply failure is recoverable by cron. */
export async function recordPayment(result: PaymentResult) {
  const provider = getDanalProvider();
  const order = await prisma.guestMonitoringOrder.findUnique({ where: { orderId: result.orderId },
    select: { guestMonitoring: { select: { guestIdentityHash: true } } } });
  if (!order) throw new GuestError("payment_failed");
  return locked(order.guestMonitoring.guestIdentityHash, async tx => {
    const current = await tx.guestMonitoringOrder.findUniqueOrThrow({ where: { orderId: result.orderId } });
    if (current.appliedAt) {
      if (current.providerTransactionId !== result.transactionId) throw new GuestError("payment_failed");
      return current;
    }
    const valid = result.merchantId === provider.merchantId && current.providerMode === provider.mode &&
      Number.isInteger(result.amount) && result.amount === current.amount && current.amount === product.amount &&
      result.currency === current.currency && current.currency === product.currency &&
      result.paidAt <= current.expiresAt.getTime() && result.paidAt >= current.createdAt.getTime() &&
      result.paidAt <= Date.now() && result.expiresAt >= result.paidAt;
    if (!valid || result.status !== "paid") {
      if (!["paid", "needs_review"].includes(current.status)) await tx.guestMonitoringOrder.update({ where: { id: current.id }, data: {
        status: result.status === "canceled" ? "canceled" : "failed",
      } });
      return null;
    }
    if (current.providerTransactionId && current.providerTransactionId !== result.transactionId) throw new GuestError("payment_failed");
    if (["refunded", "canceled"].includes(current.status)) throw new GuestError("payment_failed");
    // Callback replay must never release an order from the manual resolution queue.
    if (current.status === "needs_review") throw new GuestError("payment_needs_review", 409);
    return tx.guestMonitoringOrder.update({ where: { id: current.id }, data: {
      status: "paid", paidAt: new Date(result.paidAt), providerTransactionId: result.transactionId,
      providerReceipt: provider.mode === "mock" ? result.verificationReference : null,
    } });
  });
}
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
export async function paymentCallback(input: unknown) {
  const provider = getDanalProvider();
  const callback = await provider.payment.verifyPayment(input);
  await guestLimit("callback:payment", callback.orderId, 20);
  const verified = await provider.payment.getPayment(callback.verificationReference || callback.transactionId);
  if (verified.orderId !== callback.orderId || verified.transactionId !== callback.transactionId) throw new GuestError("payment_failed");
  const paid = await recordPayment(verified);
  if (paid) await applyPaidOrder(paid.orderId);
  return { ok: true };
}
