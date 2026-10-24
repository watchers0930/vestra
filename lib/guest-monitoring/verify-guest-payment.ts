import type { GuestMonitoringOrder } from "@prisma/client";
import { getPaymentByIdV2 } from "@/lib/danal/portone-v2-rest";
import type { V2Payment } from "@/lib/danal/portone-v2-schemas";
import { memberProviderConfig, type MemberProviderConfig } from "@/lib/member-subscription/provider";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import type { PaymentResult } from "@/lib/danal/types";
import { parseReceipt, paymentFailed, type CallbackContext } from "@/lib/danal/portone-callback";
import { GuestError } from "./errors";

// 하이브리드 검증(회원 구독과 동일 구조): 다날 결제는 V1 SDK로 만들어지지만 V2 스토어에 저장되므로
// V1 REST(api.iamport.kr)로는 조회 불가(404) → 반드시 V2 API(getPaymentByIdV2)로 조회한다.
// 정산 식별자 = order.orderId(= V2 paymentId). 바꿔치기 차단: payment.id===orderId + storeId/PG/MID/channel.type 대조.
// 비회원 GuestMonitoringOrder엔 channelEnvironment/merchantConfigVersion 필드가 없어 그 order-vs-config 대조는
// 생략하고 config.channelEnvironment만 사용(결제 생성 시 서버가 V2 스토어/채널을 고정하므로 안전).
function validateGuestPayment(order: GuestMonitoringOrder, payment: V2Payment | null,
  config: MemberProviderConfig, now = new Date()): PaymentResult {
  if (!payment) throw new GuestError("payment_pending", 409);
  const total = payment.amount.total;
  const cancelledAmt = payment.amount.cancelled ?? 0;
  if (!order.orderId.startsWith("ord_") || payment.id !== order.orderId ||
      !Number.isSafeInteger(total) || total !== order.amount || order.amount !== product.amount ||
      order.currency !== product.currency || payment.currency !== product.currency ||
      (payment.storeId !== undefined && payment.storeId !== config.storeId)) return paymentFailed();
  const base = { orderId: order.orderId, transactionId: order.orderId, merchantId: config.mid,
    amount: total, currency: payment.currency, expiresAt: order.expiresAt.getTime(),
    verificationReference: order.orderId };
  const hasCancellation = cancelledAmt > 0;
  const s = payment.status.toUpperCase();
  // READY/PAY_PENDING 등은 channel이 생략될 수 있어(V2 계약) 채널 대조는 기간을 부여하는 PAID에서만 강제.
  if (s === "READY" || s === "PAY_PENDING" || s === "VIRTUAL_ACCOUNT_ISSUED") {
    if (payment.paidAt || hasCancellation) return paymentFailed();
    throw new GuestError("payment_pending", 409);
  }
  if (s === "PAID") {
    const ch = payment.channel;
    // PAID만: 다날·우리 MID·TEST(또는 LIVE) 환경 강제 — 타 PG/타 상점/실과금 차단.
    if (ch?.pgProvider !== "DANAL_TPAY" || ch?.pgMerchantId !== config.mid ||
        ch?.type !== (config.channelEnvironment === "test" ? "TEST" : "LIVE")) return paymentFailed();
    if (hasCancellation || !payment.paidAt) return paymentFailed();
    const t = Date.parse(payment.paidAt);
    if (Number.isNaN(t) || t < order.createdAt.getTime() || t > order.expiresAt.getTime() || t > now.getTime()) return paymentFailed();
    return { ...base, status: "paid", paidAt: t };
  }
  if (s === "FAILED") {
    if (payment.paidAt || hasCancellation) return paymentFailed();
    return { ...base, status: "failed", paidAt: 0 };
  }
  if (s === "CANCELLED" || s === "PARTIAL_CANCELLED") return { ...base, status: "canceled", paidAt: 0 };
  return paymentFailed();
}

/** 콜백 컨텍스트를 주문에 바인딩(nonce/금액/만료/스토어)한 뒤 V2 API로 이중 조회·검증한다.
 *  반환은 기존 PaymentResult 형태라 recordPayment/applyPaidOrder를 그대로 재사용한다. */
export async function verifyGuestPayment(order: GuestMonitoringOrder, context: CallbackContext): Promise<PaymentResult> {
  const config = memberProviderConfig();
  // replay·바꿔치기 차단: 서버가 발급한 receipt nonce + 서명된 context의 금액/만료/스토어가 주문과 일치해야 한다.
  const receipt = parseReceipt(order.providerReceipt);
  if (context.nonce !== receipt.nonce || context.amount !== order.amount ||
      context.expiresAt !== order.expiresAt.getTime() || context.storeId !== config.storeId) return paymentFailed();
  // V2 paymentId(=orderId) 단건 조회를 두 번 — refund/cancel 등 상태 변화 감지(이중검증).
  const first = await getPaymentByIdV2(order.orderId);
  const a = validateGuestPayment(order, first, config);
  const second = await getPaymentByIdV2(order.orderId);
  let b: PaymentResult;
  try { b = validateGuestPayment(order, second, config); }
  catch { throw new GuestError("payment_needs_review", 409); }
  if (a.status !== b.status || a.paidAt !== b.paidAt) throw new GuestError("payment_needs_review", 409);
  // 진단 로깅(식별자·상태만, PII 없음) — 실카드 승인 시 멈춤 원인 즉시 규명.
  console.log("[guest-payment-v2] verified", { orderId: order.orderId, status: b.status, v2Status: second?.status });
  return b;
}
