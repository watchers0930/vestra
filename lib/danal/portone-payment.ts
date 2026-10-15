import { prisma } from "@/lib/prisma";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { GuestError, unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneConfig } from "./portone-config";
import { paymentFailed } from "./portone-callback";
import type { PortonePayment } from "./portone-rest";
import type { PaymentResult } from "./types";
export const paymentOrderSelect = {
  id: true, orderId: true, amount: true, currency: true, expiresAt: true, createdAt: true,
  providerMode: true, providerReceipt: true, providerTransactionId: true, status: true, appliedAt: true,
} as const;
export async function findPaymentOrder(reference: string) {
  if (!reference || reference.length > 128) return paymentFailed();
  const order = await prisma.guestMonitoringOrder.findUnique({ where: { orderId: reference }, select: paymentOrderSelect })
    ?? await prisma.guestMonitoringOrder.findUnique({ where: { providerTransactionId: reference }, select: paymentOrderSelect });
  if (!order || order.providerMode !== "portone") return paymentFailed();
  return order;
}
export type PaymentOrder = Awaited<ReturnType<typeof findPaymentOrder>>;
/** Terminal failure/cancellation without a paidAt cannot be a PaymentResult.
 * Carry the verified outcome internally without inventing approval data. */
export class PortoneTerminalPayment extends GuestError {
  constructor(public orderId: string, public transactionId: string, public paymentStatus: "failed" | "canceled") {
    super("payment_failed", 400);
  }
}
export async function mapPayment(order: PaymentOrder, payment: PortonePayment): Promise<PaymentResult> {
  const config = getPortoneConfig();
  if (payment.id !== order.orderId || payment.storeId !== config.storeId ||
      payment.amount.total !== order.amount || order.amount !== product.amount ||
      payment.currency !== order.currency || order.currency !== product.currency) return paymentFailed();
  if (["READY", "PAY_PENDING", "VIRTUAL_ACCOUNT_ISSUED"].includes(payment.status)) throw new GuestError("payment_pending", 409);
  if (!payment.channel) return unavailable();
  if (payment.channel.key !== config.channelKey || payment.channel.type !== "TEST" ||
      payment.channel.pgProvider !== config.pgProvider || payment.isForTest === false) return paymentFailed();
  const statuses: Record<string, "paid" | "failed" | "canceled" | undefined> = { PAID: "paid", FAILED: "failed", CANCELLED: "canceled" };
  const status = statuses[payment.status];
  if (!status) return paymentFailed(); // Includes partial cancellations; never activate.
  if (!payment.transactionId) return unavailable();
  // A failed attempt has no approval timestamp. Do not invent an approval result.
  if (!payment.paidAt && status !== "paid") {
    if (order.providerTransactionId && order.providerTransactionId !== payment.transactionId) return paymentFailed();
    throw new PortoneTerminalPayment(order.orderId, payment.transactionId, status);
  }
  if (!payment.paidAt) return unavailable();
  const paidAt = Date.parse(payment.paidAt);
  if (!Number.isFinite(paidAt) || paidAt < order.createdAt.getTime() ||
      paidAt > order.expiresAt.getTime() || paidAt > Date.now()) return paymentFailed();
  if (order.providerTransactionId && order.providerTransactionId !== payment.transactionId) return paymentFailed();
  // Cross-order transaction ownership is checked at the mutation boundary:
  // recordPayment/recordTerminalPayment under the identity lock, or cancelPayment.
  // Repeating that DB read for both REST snapshots would not prevent a race.
  return { orderId: order.orderId, transactionId: payment.transactionId, merchantId: payment.storeId,
    amount: payment.amount.total, currency: payment.currency, paidAt, status,
    expiresAt: order.expiresAt.getTime(), verificationReference: order.orderId };
}
