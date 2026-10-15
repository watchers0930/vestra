import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { prisma } from "@/lib/prisma";
import { unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneV1Config } from "./portone-v1-config";
import { callbackRequestSchema, newReceipt, parseReceipt, paymentFailed, signCallbackContext, verifyCallbackContext } from "./portone-callback";
import { cancelPaymentByImpUid, getPaymentByImpUid } from "./iamport-rest";
import { impUidSchema } from "./iamport-schemas";
import { findPaymentOrder, mapPayment, PortoneTerminalPayment } from "./portone-v1-payment";
import type { DanalProvider } from "./types";
export const portoneV1Provider: DanalProvider = {
  mode: "portone_v1",
  get merchantId() { return getPortoneV1Config().mid; },
  identity: {
    async startVerification() { return unavailable(); },
    async verifyResult() { return unavailable(); },
  },
  payment: {
    async createPayment(input) {
      const config = getPortoneV1Config();
      let order = await findPaymentOrder(input.orderId);
      if (order.amount !== product.amount || order.currency !== product.currency) return paymentFailed();
      if (order.status !== "pending" || order.expiresAt.getTime() <= Date.now()) return paymentFailed();
      if (!order.providerReceipt) {
        await prisma.guestMonitoringOrder.updateMany({ where: {
          id: order.id, providerReceipt: null, status: "pending", expiresAt: { gt: new Date() },
        }, data: { providerReceipt: newReceipt() } });
        order = await findPaymentOrder(input.orderId);
      }
      const receipt = parseReceipt(order.providerReceipt);
      if (receipt.consumed || order.status !== "pending" || order.expiresAt.getTime() <= Date.now()) return paymentFailed();
      const signed = signCallbackContext({ v: 1, purpose: "guest_payment_v1", paymentId: order.orderId,
        orderId: order.orderId, storeId: config.impCode, amount: order.amount, currency: "KRW",
        expiresAt: order.expiresAt.getTime(), nonce: receipt.nonce });
      return { provider: "portone_v1", impCode: config.impCode, pg: `${config.pgProvider}.${config.mid}`,
        paymentId: order.orderId, orderName: "등기감시 1개월", amount: String(order.amount), currency: order.currency,
        payMethod: config.payMethod, expiresAt: order.expiresAt.toISOString(),
        redirectPath: "/renewal/monitoring/guest/apply", ...signed };
    },
    async verifyPayment(input) {
      const context = verifyCallbackContext(input);
      const parsed = callbackRequestSchema.safeParse(input);
      if (!parsed.success) return paymentFailed();
      const config = getPortoneV1Config();
      const order = await findPaymentOrder(context.paymentId);
      const receipt = parseReceipt(order.providerReceipt);
      if (context.orderId !== order.orderId || context.storeId !== config.impCode || context.amount !== order.amount ||
          context.currency !== order.currency || context.expiresAt !== order.expiresAt.getTime() ||
          context.nonce !== receipt.nonce) return paymentFailed();
      // Only a recorded transaction can replay an expired/consumed context.
      if (receipt.consumed ? order.providerTransactionId !== parsed.data.imp_uid || !["paid", "needs_review"].includes(order.status) :
          context.expiresAt <= Date.now()) return paymentFailed();
      return mapPayment(order, await getPaymentByImpUid(parsed.data.imp_uid), parsed.data.imp_uid);
    },
    async getPayment(reference) {
      if (!impUidSchema.safeParse(reference).success) return paymentFailed();
      const payment = await getPaymentByImpUid(reference);
      const order = await findPaymentOrder(payment.merchant_uid);
      return mapPayment(order, payment, reference);
    },
    async cancelPayment(reference) {
      if (!impUidSchema.safeParse(reference).success) return paymentFailed();
      const payment = await getPaymentByImpUid(reference);
      const order = await findPaymentOrder(payment.merchant_uid);
      // Validate transaction ownership before any external mutation (including replays).
      const other = await prisma.guestMonitoringOrder.findUnique({
        where: { providerTransactionId: reference }, select: { orderId: true },
      });
      if (other && other.orderId !== order.orderId) return paymentFailed();
      let result;
      try { result = await mapPayment(order, payment, reference); }
      catch (error) {
        if (error instanceof PortoneTerminalPayment && error.paymentStatus === "canceled") return;
        throw error;
      }
      if (result.status === "canceled") return;
      if (result.status !== "paid") return paymentFailed();
      await cancelPaymentByImpUid(reference);
      if ((await mapPayment(order, await getPaymentByImpUid(reference), reference)).status !== "canceled") return unavailable();
      await prisma.auditLog.create({ data: { action: "GUEST_TEST_PAYMENT_CANCELED", target: order.orderId } });
    },
  },
};
