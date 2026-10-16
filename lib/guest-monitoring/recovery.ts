import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { recordPayment, applyPaidOrder } from "./activation";
export async function recoverPayments() {
  const orders = await prisma.guestMonitoringOrder.findMany({ where: { status: "paid", appliedAt: null },
    select: { orderId: true, providerTransactionId: true, providerMode: true }, take: 50, orderBy: { paidAt: "asc" } });
  let recovered = 0;
  for (const order of orders) {
    try {
      if (!order.providerTransactionId) continue;
      const provider = getDanalProvider();
      if (order.providerMode !== provider.mode) continue;
      // providerTransactionId를 넘긴다: mock은 이 값으로 조회하고, portone_v1은 findPaymentOrder가
      // orderId·providerTransactionId 둘 다 해석하며 mapPayment가 imp_uid==providerTransactionId를 강제.
      const result = await provider.payment.getPayment(order.providerTransactionId);
      if (result.orderId !== order.orderId || result.status !== "paid") continue;
      const paid = await recordPayment(result);
      if (paid) { await applyPaidOrder(order.orderId); recovered++; }
    } catch { console.error("[GuestMonitoring] payment_recovery_pending"); }
  }
  return recovered;
}
