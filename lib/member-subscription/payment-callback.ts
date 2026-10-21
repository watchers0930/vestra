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
// 하이브리드 정산 식별자 = order.orderId(= V2 paymentId). 클라가 보고하는 imp_uid(V1 transactionId)는
// V2 조회·멱등의 키가 아니다(V2는 orderId로 조회). providerTransactionId에는 orderId가 기록된다.
export async function settleMemberOrder(order: SubscriptionOrder, reverify = false) {
  const txId = order.orderId;
  if (order.status === "needs_review") return fail("payment_needs_review");
  if (order.status === "refunded") return fail("payment_failed");
  if (order.nonceConsumedAt && order.providerTransactionId !== txId) return fail("payment_failed");
  if (order.status === "paid" && order.providerTransactionId === txId) {
    // 아직 적용 전(appliedAt=null)이면 콜백 재전송 경로라도 반드시 PG 재검증한다. record 후 활성화 실패 상태에서
    // 환불(CANCELLED)이 끼어든 뒤 보관한 콜백을 재전송해 '최초 기간 부여'를 받아가는 구멍을 막는다.
    // 이미 적용된(appliedAt 존재) 주문의 재전송만 PG 조회 없이 멱등 반환한다.
    if (reverify || !order.appliedAt) {
      const current = await verifyMemberPayment(order);
      if (current.status !== "paid") { await markReversed(order, current.status); return fail("payment_failed"); }
    }
    return activateMemberOrder(order.userId, order.orderId);
  }
  try {
    const verified = await verifyMemberPayment(order);
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
  // 재전송 멱등 기준은 orderId(= providerTransactionId). 클라 imp_uid는 서명/정산에 쓰지 않는다.
  verifyCallbackContext(order, input.callbackContext, input.callbackSignature, order.orderId);
  await settleMemberOrder(order);
  return { ok: true as const };
}
