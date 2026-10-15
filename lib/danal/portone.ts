import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { PortoneTerminalPayment } from "./portone-payment";
import { prisma } from "@/lib/prisma";
import { unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneConfig } from "./portone-config";
import { newReceipt, parseReceipt, paymentFailed, signCallbackContext, verifyCallbackContext } from "./portone-callback";
import { cancelPaymentById, getPaymentById } from "./portone-rest";
import { findPaymentOrder, mapPayment } from "./portone-payment";
import type { DanalProvider } from "./types";
export const portoneProvider: DanalProvider = {
  mode: "portone",
  get merchantId() { return getPortoneConfig().storeId; },
  identity: {
    async startVerification() { return unavailable(); },
    async verifyResult() { return unavailable(); },
  },
  payment: {
    async createPayment(input) {
      const config = getPortoneConfig();
      let order = await findPaymentOrder(input.orderId);
      if (order.amount !== product.amount || order.currency !== product.currency) return paymentFailed();
      if (order.status !== "pending" || order.expiresAt.getTime() <= Date.now()) return paymentFailed();
      if (!order.providerReceipt) {
        // Compare-and-set preserves the winning nonce across tabs and simultaneous resumes.
        await prisma.guestMonitoringOrder.updateMany({ where: {
          id: order.id, providerReceipt: null, status: "pending", expiresAt: { gt: new Date() },
        }, data: { providerReceipt: newReceipt() } });
        order = await findPaymentOrder(input.orderId);
      }
      const receipt = parseReceipt(order.providerReceipt);
      if (receipt.consumed || order.status !== "pending" || order.expiresAt.getTime() <= Date.now()) return paymentFailed();
      const signed = signCallbackContext({ v: 1, purpose: "guest_payment_v1", paymentId: order.orderId,
        orderId: order.orderId, storeId: config.storeId, amount: order.amount, currency: "KRW",
        expiresAt: order.expiresAt.getTime(), nonce: receipt.nonce });
      return { provider: "portone", storeId: config.storeId, channelKey: config.channelKey,
        paymentId: order.orderId, orderName: "등기감시 1개월", totalAmount: String(order.amount), currency: order.currency,
        payMethod: config.payMethod, expiresAt: order.expiresAt.toISOString(), ...signed };
    },
    async verifyPayment(input) {
      const context = verifyCallbackContext(input);
      const config = getPortoneConfig();
      const order = await findPaymentOrder(context.paymentId);
      const receipt = parseReceipt(order.providerReceipt);
      if (context.orderId !== order.orderId || context.storeId !== config.storeId || context.amount !== order.amount ||
          context.currency !== order.currency || context.expiresAt !== order.expiresAt.getTime() ||
          context.nonce !== receipt.nonce) return paymentFailed();
      // A signed replay may recover an already recorded payment after a lost response.
      if (receipt.consumed ? !order.providerTransactionId || !["paid", "needs_review"].includes(order.status) :
          context.expiresAt <= Date.now()) return paymentFailed();
      return mapPayment(order, await getPaymentById(order.orderId));
    },
    async getPayment(reference) {
      const order = await findPaymentOrder(reference);
      return mapPayment(order, await getPaymentById(order.orderId));
    },
    async cancelPayment(reference) {
      const order = await findPaymentOrder(reference);
      let result;
      try { result = await mapPayment(order, await getPaymentById(order.orderId)); }
      catch (error) {
        if (error instanceof PortoneTerminalPayment && error.paymentStatus === "canceled") return;
        throw error;
      }
      if (result.status === "canceled") return;
      if (result.status !== "paid") return paymentFailed();
      // Mapping is read-only; retain cross-order ownership validation before this mutation.
      const other = await prisma.guestMonitoringOrder.findUnique({
        where: { providerTransactionId: result.transactionId }, select: { orderId: true },
      });
      if (other && other.orderId !== order.orderId) return paymentFailed();
      await cancelPaymentById(order.orderId);
      if ((await mapPayment(order, await getPaymentById(order.orderId))).status !== "canceled") return unavailable();
      await prisma.auditLog.create({ data: { action: "GUEST_TEST_PAYMENT_CANCELED", target: order.orderId } });
    },
  },
};
