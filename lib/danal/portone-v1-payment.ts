import { prisma } from "@/lib/prisma";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { getPortoneV1Config } from "./portone-v1-config";
import { paymentFailed } from "./portone-callback";
import type { IamportPayment } from "./iamport-rest";
import type { PaymentResult } from "./types";
export const paymentOrderSelect = {
  id: true, orderId: true, amount: true, currency: true, expiresAt: true, createdAt: true,
  providerMode: true, providerReceipt: true, providerTransactionId: true, status: true, appliedAt: true,
} as const;
export async function findPaymentOrder(reference: string) {
  if (!reference || reference.length > 128) return paymentFailed();
  const order = await prisma.guestMonitoringOrder.findUnique({ where: { orderId: reference }, select: paymentOrderSelect })
    ?? await prisma.guestMonitoringOrder.findUnique({ where: { providerTransactionId: reference }, select: paymentOrderSelect });
  if (!order || order.providerMode !== "portone_v1") return paymentFailed();
  return order;
}
export type PaymentOrder = Awaited<ReturnType<typeof findPaymentOrder>>;
/** Unapproved terminal outcomes never fabricate a paidAt. */
export class PortoneTerminalPayment extends GuestError {
  constructor(public orderId: string, public transactionId: string, public paymentStatus: "failed" | "canceled") {
    super("payment_failed", 400);
  }
}
export async function mapPayment(order: PaymentOrder, payment: IamportPayment, expectedImpUid: string): Promise<PaymentResult> {
  const config = getPortoneV1Config();
  if (payment.imp_uid !== expectedImpUid || payment.merchant_uid !== order.orderId ||
      order.providerMode !== "portone_v1" || !Number.isInteger(payment.amount) ||
      payment.amount !== order.amount || order.amount !== product.amount ||
      payment.currency !== order.currency || order.currency !== product.currency ||
      payment.pg_provider !== config.pgProvider || payment.pg_id !== config.mid || payment.pay_method !== config.payMethod ||
      payment.sandbox === false || (order.providerTransactionId && order.providerTransactionId !== payment.imp_uid)) return paymentFailed();
  const history = payment.cancel_history ?? [];
  const canceled = payment.cancel_amount > 0 || (payment.cancelled_at ?? 0) > 0 || history.length > 0;
  if (!Number.isInteger(payment.cancel_amount) || payment.cancel_amount > payment.amount ||
      (history.length > 0 && history.reduce((sum, item) => sum + item.amount, 0) !== payment.cancel_amount)) return paymentFailed();
  if (payment.status !== "cancelled" && canceled) return paymentFailed();
  if (payment.status === "ready") {
    if (payment.paid_at) return paymentFailed();
    throw new GuestError("payment_pending", 409);
  }
  if (!["paid", "failed", "cancelled"].includes(payment.status)) return paymentFailed();
  if (payment.status === "failed" && payment.paid_at) return paymentFailed();
  if (payment.status === "cancelled") {
    // An approved cancellation must be full. Unapproved cancellations may have zero amount.
    if (payment.paid_at ? payment.cancel_amount !== payment.amount || !payment.cancelled_at : payment.cancel_amount !== 0) return paymentFailed();
    if (payment.paid_at && (payment.cancelled_at! < payment.paid_at || history.some(item =>
      item.cancelled_at < payment.paid_at! || item.cancelled_at > payment.cancelled_at!))) return paymentFailed();
    if ((payment.cancelled_at ?? 0) * 1000 > Date.now()) return paymentFailed();
  }
  if (!payment.paid_at) {
    if (payment.status === "paid") return paymentFailed();
    throw new PortoneTerminalPayment(order.orderId, payment.imp_uid, payment.status === "failed" ? "failed" : "canceled");
  }
  const paidAt = payment.paid_at * 1000;
  if (!Number.isSafeInteger(paidAt) || paidAt < order.createdAt.getTime() ||
      paidAt > order.expiresAt.getTime() || paidAt > Date.now()) return paymentFailed();
  return { orderId: order.orderId, transactionId: payment.imp_uid, merchantId: config.mid,
    amount: payment.amount, currency: payment.currency, paidAt,
    status: payment.status === "paid" ? "paid" : "canceled",
    expiresAt: order.expiresAt.getTime(), verificationReference: payment.imp_uid };
}
