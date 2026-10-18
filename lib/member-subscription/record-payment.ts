import type { SubscriptionOrder } from "@prisma/client";
import { memberTransaction } from "./transaction";
import { fail } from "./errors";
import type { VerifiedPayment } from "./verification";
export async function markNeedsReview(order: SubscriptionOrder) {
  await memberTransaction(order.userId, tx => tx.subscriptionOrder.updateMany({
    where: { id: order.id, appliedAt: null, status: { in: ["pending", "paid", "failed"] } }, data: { status: "needs_review" },
  }));
}
/** A paid-but-unapplied order found reversed at the PG on re-verification. Mark it so
 * the recovery/cron paths stop trying to grant a term for a refunded/canceled charge.
 * Only touches unapplied orders — an already-applied subscription reversal is out of scope. */
export async function markReversed(order: SubscriptionOrder, status: "failed" | "canceled") {
  await memberTransaction(order.userId, tx => tx.subscriptionOrder.updateMany({
    where: { id: order.id, appliedAt: null, status: "paid" },
    data: { status: status === "canceled" ? "refunded" : "failed" },
  }));
}
export async function recordMemberPayment(order: SubscriptionOrder, verified: VerifiedPayment) {
  return memberTransaction(order.userId, async tx => {
    const current = await tx.subscriptionOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (current.status === "needs_review") return fail("payment_needs_review");
    // Global transaction lock serializes member transactions as well as cross-table checks.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${verified.impUid}, 0))`;
    const [guest, other] = await Promise.all([
      tx.guestMonitoringOrder.findFirst({ where: { providerTransactionId: verified.impUid }, select: { id: true } }),
      tx.subscriptionOrder.findFirst({ where: { providerTransactionId: verified.impUid, id: { not: order.id } }, select: { id: true } }),
    ]);
    if (guest || other) fail("transaction_conflict");
    if (current.nonceConsumedAt) {
      if (current.providerTransactionId !== verified.impUid) fail("payment_failed");
      if (current.status !== verified.status) fail("payment_needs_review");
      return current;
    }
    if (["refunded", "canceled", "paid"].includes(current.status)) fail("payment_failed");
    const updated = await tx.subscriptionOrder.updateMany({ where: {
      id: order.id, callbackNonceHash: order.callbackNonceHash, nonceConsumedAt: null,
      appliedAt: null, status: { in: ["pending", "failed"] },
    }, data: { status: verified.status, providerTransactionId: verified.impUid, paidAt: verified.paidAt,
      nonceConsumedAt: new Date(), verificationEvidence: verified.evidence } });
    if (updated.count !== 1) fail("payment_failed");
    console.info("[MemberSubscription]", { orderId: order.orderId, event: "payment_recorded", status: verified.status });
    return tx.subscriptionOrder.findUniqueOrThrow({ where: { id: order.id } });
  });
}
