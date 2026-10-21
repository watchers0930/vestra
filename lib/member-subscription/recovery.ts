import { ownedOrder } from "./orders";
import { settleMemberOrder } from "./payment-callback";
import { markNeedsReview } from "./record-payment";
import { MemberError, fail } from "./errors";
/**
 * HTTP 계약: 새로 발견한 pending/needs_review는 200 상태 DTO(applied:false)다.
 * 이미 needs_review인 주문은 409 payment_needs_review 오류다.
 * 호출자는 HTTP 성공만으로 결제 적용을 판단하지 않고 status/applied를 확인해야 한다.
 *
 * 하이브리드: V2 조회는 orderId 단일 키라 imp_uid 역탐색(findImpUidByMerchantUid)이 불필요하다.
 * impUid(모바일 복귀 쿼리 등)는 "결제가 있을 수 있다"는 신호로만 쓰고(종료상태 재검증 유도), 조회 자체는 orderId로 한다.
 */
export async function recoverMemberOrder(userId: string, orderId: string, impUid?: string) {
  const order = await ownedOrder(userId, orderId);
  if (order.status === "needs_review") return fail("payment_needs_review");
  if (["refunded", "canceled", "failed"].includes(order.status) && !impUid) return { status: order.status, applied: !!order.appliedAt };
  try {
    // Delayed recovery: reverify(orderId 기준)로 refund가 paid 기록 이후 도착해도 기간을 부여하지 않는다.
    const result = await settleMemberOrder(order, true);
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
