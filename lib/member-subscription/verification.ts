import type { SubscriptionOrder } from "@prisma/client";
import { getPaymentByImpUid, type IamportPayment } from "@/lib/danal/iamport-rest";
import { fail, providerBoundary } from "./errors";
import { computeAmount } from "./pricing";
import { memberProviderConfig, type MemberProviderConfig } from "./provider";
export type VerifiedPayment = { status: "paid" | "failed" | "canceled"; impUid: string; paidAt: Date | null;
  evidence: { status: string; amount: number; currency: string; checkedAt: string; channelEnvironment: string } };
export function validatePayment(order: SubscriptionOrder, impUid: string, payment: IamportPayment,
  config: MemberProviderConfig, now = new Date()): VerifiedPayment {
  if (order.channelEnvironment !== config.channelEnvironment || order.merchantConfigVersion !== config.merchantConfigVersion) fail("provider_unavailable");
  if (!order.orderId.startsWith("msub_") || payment.imp_uid !== impUid || payment.merchant_uid !== order.orderId ||
      !Number.isSafeInteger(payment.amount) || payment.amount !== order.amount ||
      order.amount !== computeAmount(order.monthlyPrice, order.durationMonths, order.discountPercent) ||
      order.currency !== "KRW" || payment.currency !== "KRW" || payment.pg_provider !== "danal_tpay" ||
      payment.pay_method !== "card" || payment.pg_id !== config.mid) fail("payment_failed");
  if (typeof payment.sandbox !== "boolean" || payment.sandbox !== (order.channelEnvironment === "test")) fail("provider_unavailable");
  const hasCancellation = payment.cancel_amount > 0 || !!payment.cancelled_at || (payment.cancel_history?.length ?? 0) > 0;
  if (payment.status === "ready") {
    if (payment.paid_at || hasCancellation) fail("payment_failed");
    return fail("payment_pending");
  }
  let status: VerifiedPayment["status"];
  let paidAt: Date | null = null;
  if (payment.status === "paid") {
    if (hasCancellation || !payment.paid_at) fail("payment_failed");
    paidAt = new Date(payment.paid_at * 1000);
    if (paidAt < order.createdAt || paidAt > order.expiresAt || paidAt > now) fail("payment_failed");
    status = "paid";
  } else if (payment.status === "failed" || payment.status === "cancelled") {
    if (payment.paid_at || payment.cancel_amount > 0 || (payment.cancel_history?.length ?? 0) > 0) fail("payment_failed");
    status = payment.status === "failed" ? "failed" : "canceled";
  } else return fail("payment_failed");
  return { status, impUid, paidAt, evidence: { status, amount: order.amount, currency: "KRW",
    checkedAt: now.toISOString(), channelEnvironment: config.channelEnvironment } };
}
export async function verifyMemberPayment(order: SubscriptionOrder, impUid: string): Promise<VerifiedPayment> {
  const config = memberProviderConfig();
  const first = await providerBoundary(() => getPaymentByImpUid(impUid));
  const a = validatePayment(order, impUid, first, config);
  const second = await providerBoundary(() => getPaymentByImpUid(impUid));
  let b: VerifiedPayment;
  try { b = validatePayment(order, impUid, second, config); }
  catch { return fail("payment_needs_review"); }
  if (a.status !== b.status || a.paidAt?.getTime() !== b.paidAt?.getTime()) fail("payment_needs_review");
  return b;
}
