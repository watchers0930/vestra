import type { SubscriptionOrder } from "@prisma/client";
import { getPaymentByIdV2 } from "@/lib/danal/portone-v2-rest";
import type { V2Payment } from "@/lib/danal/portone-v2-schemas";
import { fail, providerBoundary } from "./errors";
import { computeAmount } from "./pricing";
import { memberProviderConfig, type MemberProviderConfig } from "./provider";
export type VerifiedPayment = { status: "paid" | "failed" | "canceled"; impUid: string; paidAt: Date | null;
  evidence: { status: string; amount: number; currency: string; checkedAt: string; channelEnvironment: string } };
// V2: 식별자는 paymentId 단일(= 서버 orderId). 클라가 보고한 paymentId(providedId)와 서버 조회 결과(payment.id),
// 서버 주문(order.orderId)이 모두 일치해야 한다(바꿔치기 차단). payment가 null이면 미결제(pending).
// ⚠️ PoC(§11.1) 실응답으로 channel.pgProvider(다날 식별)·금액 필드·sandbox 표기를 확인해 대조를 강화할 것.
export function validatePayment(order: SubscriptionOrder, providedId: string, payment: V2Payment | null,
  config: MemberProviderConfig, now = new Date()): VerifiedPayment {
  if (order.channelEnvironment !== config.channelEnvironment || order.merchantConfigVersion !== config.merchantConfigVersion) fail("provider_unavailable");
  if (!payment) return fail("payment_pending");
  const total = payment.amount.total;
  const cancelledAmt = payment.amount.cancelled ?? 0;
  if (!order.orderId.startsWith("msub_") || payment.id !== providedId || payment.id !== order.orderId ||
      !Number.isSafeInteger(total) || total !== order.amount ||
      order.amount !== computeAmount(order.monthlyPrice, order.durationMonths, order.discountPercent) ||
      order.currency !== "KRW" || payment.currency !== "KRW") fail("payment_failed");
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
  return { status, impUid: payment.id, paidAt, evidence: { status, amount: order.amount, currency: "KRW",
    checkedAt: now.toISOString(), channelEnvironment: config.channelEnvironment } };
}
export async function verifyMemberPayment(order: SubscriptionOrder, providedId: string): Promise<VerifiedPayment> {
  const config = memberProviderConfig();
  // V2는 paymentId(=orderId) 단건 조회. 두 번 조회해 refund/cancel 등 상태 변화를 감지한다(§7.1 이중검증).
  const first = await providerBoundary(() => getPaymentByIdV2(order.orderId));
  const a = validatePayment(order, providedId, first, config);
  const second = await providerBoundary(() => getPaymentByIdV2(order.orderId));
  let b: VerifiedPayment;
  try { b = validatePayment(order, providedId, second, config); }
  catch { return fail("payment_needs_review"); }
  if (a.status !== b.status || a.paidAt?.getTime() !== b.paidAt?.getTime()) fail("payment_needs_review");
  return b;
}
