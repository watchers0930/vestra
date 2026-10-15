import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { recordPayment, applyPaidOrder } from "./activation";
export async function recoverPayments() {
  const orders = await prisma.guestMonitoringOrder.findMany({ where: { status: "paid", appliedAt: null },
    select: { orderId: true, providerTransactionId: true }, take: 50, orderBy: { paidAt: "asc" } });
  let recovered = 0;
  for (const order of orders) {
    try {
      if (!order.providerTransactionId) continue;
      const result = await getDanalProvider().payment.getPayment(order.providerTransactionId);
      if (result.orderId !== order.orderId || result.status !== "paid") continue;
      const paid = await recordPayment(result);
      if (paid) { await applyPaidOrder(order.orderId); recovered++; }
    } catch { console.error("[GuestMonitoring] payment_recovery_pending"); }
  }
  return recovered;
}
