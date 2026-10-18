import { findImpUidByMerchantUid } from "@/lib/danal/iamport-rest";
import { ownedOrder } from "./orders";
import { settleMemberOrder } from "./payment-callback";
import { markNeedsReview } from "./record-payment";
import { MemberError, providerBoundary, fail } from "./errors";
export async function recoverMemberOrder(userId: string, orderId: string, impUid?: string) {
  const order = await ownedOrder(userId, orderId);
  if (order.status === "needs_review") return fail("payment_needs_review");
  if (["refunded", "canceled", "failed"].includes(order.status) && !impUid) return { status: order.status, applied: !!order.appliedAt };
  try {
    const candidate = impUid ?? order.providerTransactionId ?? await providerBoundary(() => findImpUidByMerchantUid(orderId));
    if (!candidate) return { status: order.status, applied: !!order.appliedAt };
    // Delayed recovery: reverify so a refund landing after the paid record cannot grant a term.
    const result = await settleMemberOrder(order, candidate, true);
    return { status: result.status, applied: !!result.appliedAt };
  } catch (error) {
    if (error instanceof MemberError && error.code === "payment_needs_review") {
      await markNeedsReview(order);
      return { status: "needs_review", applied: false };
    }
    if (error instanceof MemberError && error.code === "payment_pending") return { status: "pending", applied: false };
    throw error;
  }
}
