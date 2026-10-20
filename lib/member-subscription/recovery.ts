import { ownedOrder } from "./orders";
import { settleMemberOrder } from "./payment-callback";
import { markNeedsReview } from "./record-payment";
import { MemberError, fail } from "./errors";
/**
 * HTTP 계약: 새로 발견한 pending/needs_review는 200 상태 DTO(applied:false)다.
 * 이미 needs_review인 주문은 409 payment_needs_review 오류다.
 * 호출자는 HTTP 성공만으로 결제 적용을 판단하지 않고 status/applied를 확인해야 한다.
 */
export async function recoverMemberOrder(userId: string, orderId: string, impUid?: string) {
  const order = await ownedOrder(userId, orderId);
  if (order.status === "needs_review") return fail("payment_needs_review");
  if (["refunded", "canceled", "failed"].includes(order.status) && !impUid) return { status: order.status, applied: !!order.appliedAt };
  try {
    // V2: 결제 식별자 = paymentId = orderId. imp_uid 역탐색(findAll) 불필요 — orderId로 직접 조회·검증.
    const candidate = impUid ?? order.providerTransactionId ?? order.orderId;
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
