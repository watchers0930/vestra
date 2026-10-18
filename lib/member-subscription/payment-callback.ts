import type { SubscriptionOrder } from "@prisma/client";
import type { MemberPaymentCallbackRequest } from "@/types/member-subscription";
import { ownedOrder } from "./orders";
import { verifyCallbackContext } from "./callback-context";
import { verifyMemberPayment } from "./verification";
import { recordMemberPayment, markNeedsReview, markReversed } from "./record-payment";
import { activateMemberOrder } from "./activation";
import { fail, MemberError } from "./errors";
/**
 * reverify: force a fresh PG snapshot before activating an already-`paid` order.
 * The immediate callback replay path (reverify=false) trusts the record just written in
 * this session. Delayed paths (cron lifecycle, user-driven /recover) MUST reverify — a
 * refund/cancel can land between record and activation, and granting a term for a reversed
 * charge would be a financial defect. On reversal the order is marked and activation refused.
 */
export async function settleMemberOrder(order: SubscriptionOrder, impUid: string, reverify = false) {
  if (order.status === "needs_review") return fail("payment_needs_review");
  if (order.status === "refunded") return fail("payment_failed");
  if (order.nonceConsumedAt && order.providerTransactionId !== impUid) return fail("payment_failed");
  if (order.status === "paid" && order.providerTransactionId === impUid) {
    if (reverify) {
      const current = await verifyMemberPayment(order, impUid);
      if (current.status !== "paid") { await markReversed(order, current.status); return fail("payment_failed"); }
    }
    return activateMemberOrder(order.userId, order.orderId);
  }
  try {
    const verified = await verifyMemberPayment(order, impUid);
    const recorded = await recordMemberPayment(order, verified);
    if (recorded.status !== "paid") return fail("payment_failed");
    return await activateMemberOrder(order.userId, order.orderId);
  } catch (error) {
    if (error instanceof MemberError && error.code === "payment_needs_review") await markNeedsReview(order);
    throw error;
  }
}
export async function memberPaymentCallback(userId: string, input: MemberPaymentCallbackRequest) {
  const order = await ownedOrder(userId, input.paymentId);
  if (order.status === "needs_review") return fail("payment_needs_review");
  verifyCallbackContext(order, input.callbackContext, input.callbackSignature, input.imp_uid);
  await settleMemberOrder(order, input.imp_uid);
  return { ok: true as const };
}
