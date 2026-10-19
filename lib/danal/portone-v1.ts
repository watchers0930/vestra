import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { prisma } from "@/lib/prisma";
import { unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneV1Config } from "./portone-v1-config";
import { callbackRequestSchema, newReceipt, parseReceipt, paymentFailed, signCallbackContext, verifyCallbackContext } from "./portone-callback";
import { cancelPaymentByImpUid, getPaymentByImpUid, getPaymentByMerchantUid } from "./iamport-rest";
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
      // 아임포트 테스트 환경에서 imp_uid 직접조회가 실패하므로 서버가 아는 merchant_uid(orderId)로 조회.
      // mapPayment가 반환 결제의 imp_uid == 클라이언트 imp_uid 및 금액/상태/PG를 모두 대조한다.
      return mapPayment(order, await getPaymentByMerchantUid(order.orderId), parsed.data.imp_uid);
    },
    async getPayment(reference) {
      // imp_uid 직접조회(/payments/{imp_uid})가 아임포트 테스트에서 "존재하지 않는 결제"로
      // 실패하므로, 주문(orderId=merchant_uid)으로 찾아 merchant_uid 기준으로 결제를 재조회한다.
      // reference는 orderId(정상 흐름) 또는 imp_uid(기록 후 복구)를 모두 허용(findPaymentOrder가 처리).
      // imp_uid 교차대조는 호출부(payment-callback)가 verified.transactionId로 수행한다.
      const order = await findPaymentOrder(reference);
      const payment = await getPaymentByMerchantUid(order.orderId);
      return mapPayment(order, payment, payment.imp_uid);
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
