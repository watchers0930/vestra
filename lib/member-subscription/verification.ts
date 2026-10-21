import type { SubscriptionOrder } from "@prisma/client";
import { getPaymentByIdV2 } from "@/lib/danal/portone-v2-rest";
import type { V2Payment } from "@/lib/danal/portone-v2-schemas";
import { fail, providerBoundary } from "./errors";
import { computeAmount } from "./pricing";
import { memberProviderConfig, type MemberProviderConfig } from "./provider";
export type VerifiedPayment = { status: "paid" | "failed" | "canceled"; impUid: string; paidAt: Date | null;
  evidence: { status: string; amount: number; currency: string; checkedAt: string; channelEnvironment: string } };
// 하이브리드 검증: 결제는 V1 SDK(다날)로 만들어지지만 V2 스토어라 V2 API로 조회된다(payment.version="V1").
// 식별자는 paymentId(= 서버 orderId) 단일. 바꿔치기 차단: payment.id===order.orderId + storeId/pgProvider/pgMerchantId/channel.type 대조.
// imp_uid(클라 보고값)는 정산 키가 아니다(V2 조회는 orderId 기준). payment.transactionId가 V1 imp_uid.
export function validatePayment(order: SubscriptionOrder, payment: V2Payment | null,
  config: MemberProviderConfig, now = new Date()): VerifiedPayment {
  if (order.channelEnvironment !== config.channelEnvironment || order.merchantConfigVersion !== config.merchantConfigVersion) fail("provider_unavailable");
  if (!payment) return fail("payment_pending");
  const total = payment.amount.total;
  const cancelledAmt = payment.amount.cancelled ?? 0;
  const ch = payment.channel;
  // 식별·금액·채널 일치(하나라도 어긋나면 결제실패로 간주).
  if (!order.orderId.startsWith("msub_") || payment.id !== order.orderId ||
      !Number.isSafeInteger(total) || total !== order.amount ||
      order.amount !== computeAmount(order.monthlyPrice, order.durationMonths, order.discountPercent) ||
      order.currency !== "KRW" || payment.currency !== "KRW" ||
      (payment.storeId !== undefined && payment.storeId !== config.storeId) ||
      ch?.pgProvider !== "DANAL_TPAY" || ch?.pgMerchantId !== config.mid) fail("payment_failed");
  // 환경 대조: 테스트 주문은 반드시 TEST 채널 결제여야 한다(실과금 차단).
  if (ch?.type !== (order.channelEnvironment === "test" ? "TEST" : "LIVE")) fail("provider_unavailable");
  const hasCancellation = cancelledAmt > 0;
  const s = payment.status.toUpperCase();
  if (s === "READY" || s === "PAY_PENDING" || s === "VIRTUAL_ACCOUNT_ISSUED") {
    if (payment.paidAt || hasCancellation) fail("payment_failed");
    return fail("payment_pending");
  }
  let status: VerifiedPayment["status"];
  let paidAt: Date | null = null;
  if (s === "PAID") {
    if (hasCancellation || !payment.paidAt) fail("payment_failed");
    const t = Date.parse(payment.paidAt);
    if (Number.isNaN(t)) fail("payment_failed");
    paidAt = new Date(t);
    if (paidAt < order.createdAt || paidAt > order.expiresAt || paidAt > now) fail("payment_failed");
    status = "paid";
  } else if (s === "FAILED") {
    if (payment.paidAt || cancelledAmt > 0) fail("payment_failed");
    status = "failed";
  } else if (s === "CANCELLED" || s === "PARTIAL_CANCELLED") {
    status = "canceled";
  } else return fail("payment_failed");
  // impUid 필드는 정산 식별자(= orderId)를 운반한다(providerTransactionId로 기록, 재전송 멱등 기준).
  return { status, impUid: order.orderId, paidAt, evidence: { status, amount: order.amount, currency: "KRW",
    checkedAt: now.toISOString(), channelEnvironment: config.channelEnvironment } };
}
export async function verifyMemberPayment(order: SubscriptionOrder): Promise<VerifiedPayment> {
  const config = memberProviderConfig();
  // V2 paymentId(=orderId) 단건 조회를 두 번 해 refund/cancel 등 상태 변화를 감지한다(이중검증).
  const first = await providerBoundary(() => getPaymentByIdV2(order.orderId));
  const a = validatePayment(order, first, config);
  const second = await providerBoundary(() => getPaymentByIdV2(order.orderId));
  let b: VerifiedPayment;
  try { b = validatePayment(order, second, config); }
  catch { return fail("payment_needs_review"); }
  if (a.status !== b.status || a.paidAt?.getTime() !== b.paidAt?.getTime()) fail("payment_needs_review");
  return b;
}
