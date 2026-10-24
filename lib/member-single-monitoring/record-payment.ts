import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { MEMBER_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import type { PaymentResult } from "@/lib/danal/types";
import { SingleError } from "./errors";
import { lockedSingle } from "./transaction";

/** 검증된 결제를 먼저 기록(apply 실패해도 cron/재콜백으로 복구 가능). mock 전용 경로. */
export async function recordSinglePayment(result: PaymentResult) {
  const provider = getDanalProvider();
  const order = await prisma.memberSingleMonitoringOrder.findUnique({
    where: { orderId: result.orderId }, select: { userId: true },
  });
  if (!order) throw new SingleError("payment_failed");
  return lockedSingle(order.userId, async tx => {
    const current = await tx.memberSingleMonitoringOrder.findUniqueOrThrow({ where: { orderId: result.orderId } });
    if (current.appliedAt) {
      if (current.providerTransactionId !== result.transactionId) throw new SingleError("payment_failed");
      return current; // 이미 적용된 주문의 콜백 재생 — 멱등 반환
    }
    const valid =
      result.merchantId === provider.merchantId && current.providerMode === provider.mode &&
      Number.isInteger(result.amount) && result.amount === current.amount && current.amount === product.amount &&
      result.currency === current.currency && current.currency === product.currency &&
      result.paidAt <= current.expiresAt.getTime() && result.paidAt >= current.createdAt.getTime() &&
      result.paidAt <= Date.now() && result.expiresAt >= result.paidAt;
    if (!valid || result.status !== "paid") {
      if (!["paid", "needs_review"].includes(current.status)) {
        await tx.memberSingleMonitoringOrder.update({ where: { id: current.id }, data: {
          status: result.status === "canceled" ? "canceled" : "failed",
        } });
      }
      return null;
    }
    if (current.providerTransactionId && current.providerTransactionId !== result.transactionId) throw new SingleError("payment_failed");
    if (["refunded", "canceled"].includes(current.status)) throw new SingleError("payment_failed");
    // 콜백 재생이 수동 검토 큐의 주문을 풀어서는 안 된다.
    if (current.status === "needs_review") throw new SingleError("payment_needs_review", 409);
    return tx.memberSingleMonitoringOrder.update({ where: { id: current.id }, data: {
      status: "paid", paidAt: new Date(result.paidAt), providerTransactionId: result.transactionId,
      providerReceipt: result.verificationReference,
    } });
  });
}
