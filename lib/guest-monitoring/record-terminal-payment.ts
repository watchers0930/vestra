import { prisma } from "@/lib/prisma";
import { parseReceipt, paymentFailed } from "@/lib/danal/portone-callback";
import type { PortoneTerminalPayment } from "@/lib/danal/portone-payment";
import { locked } from "./transaction";
/** Never synthesize paidAt or consume an approval nonce for an unapproved outcome. */
export async function recordTerminalPayment(result: PortoneTerminalPayment) {
  const ref = await prisma.guestMonitoringOrder.findUnique({ where: { orderId: result.orderId },
    select: { guestMonitoring: { select: { guestIdentityHash: true } } } });
  if (!ref) return paymentFailed();
  return locked(ref.guestMonitoring.guestIdentityHash, async tx => {
    const current = await tx.guestMonitoringOrder.findUniqueOrThrow({ where: { orderId: result.orderId } });
    if (current.providerMode !== "portone" || current.appliedAt ||
        ["paid", "needs_review", "refunded"].includes(current.status) || parseReceipt(current.providerReceipt).consumed) return paymentFailed();
    if (current.providerTransactionId && current.providerTransactionId !== result.transactionId) return paymentFailed();
    const other = await tx.guestMonitoringOrder.findUnique({ where: { providerTransactionId: result.transactionId }, select: { orderId: true } });
    if (other && other.orderId !== current.orderId) return paymentFailed();
    if (current.status === result.paymentStatus) return;
    if (current.status === "canceled") return paymentFailed();
    await tx.guestMonitoringOrder.update({ where: { id: current.id }, data: { status: result.paymentStatus } });
    await tx.auditLog.create({ data: { action: "GUEST_PAYMENT_TERMINAL", target: current.orderId,
      detail: JSON.stringify({ status: result.paymentStatus }) } });
  });
}
