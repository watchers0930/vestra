import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import type { PaymentResult } from "@/lib/danal/types";
import { parseReceipt, encodeReceipt, paymentFailed } from "@/lib/danal/portone-callback";
import { GuestError } from "./errors";
import { locked } from "./transaction";
/** Persist verified payment first so a subsequent apply failure is recoverable by cron. */
export async function recordPayment(result: PaymentResult) {
  const provider = getDanalProvider();
  const order = await prisma.guestMonitoringOrder.findUnique({ where: { orderId: result.orderId },
    select: { guestMonitoring: { select: { guestIdentityHash: true } } } });
  if (!order) throw new GuestError("payment_failed");
  try { return await locked(order.guestMonitoring.guestIdentityHash, async tx => {
    const current = await tx.guestMonitoringOrder.findUniqueOrThrow({ where: { orderId: result.orderId } });
    if (current.appliedAt && provider.mode !== "portone") {
      if (current.providerTransactionId !== result.transactionId) throw new GuestError("payment_failed");
      return current;
    }
    const valid = result.merchantId === provider.merchantId && current.providerMode === provider.mode &&
      Number.isInteger(result.amount) && result.amount === current.amount && current.amount === product.amount &&
      result.currency === current.currency && current.currency === product.currency &&
      result.paidAt <= current.expiresAt.getTime() && result.paidAt >= current.createdAt.getTime() &&
      result.paidAt <= Date.now() && result.expiresAt >= result.paidAt &&
      (provider.mode !== "portone" || result.expiresAt === current.expiresAt.getTime());
    if (provider.mode === "portone" && !valid) return paymentFailed();
    if (provider.mode === "portone" && current.providerTransactionId &&
        current.providerTransactionId !== result.transactionId) return paymentFailed();
    if (!valid || result.status !== "paid") {
      if (provider.mode === "portone") {
        // Non-approval results with paidAt also reach this boundary.
        const other = await tx.guestMonitoringOrder.findUnique({ where: { providerTransactionId: result.transactionId }, select: { orderId: true } });
        if (other && other.orderId !== current.orderId) return paymentFailed();
      }
      if (!["paid", "needs_review"].includes(current.status)) await tx.guestMonitoringOrder.update({ where: { id: current.id }, data: {
        status: result.status === "canceled" ? "canceled" : "failed",
      } });
      return null;
    }
    if (current.providerTransactionId && current.providerTransactionId !== result.transactionId) throw new GuestError("payment_failed");
    if (["refunded", "canceled"].includes(current.status)) throw new GuestError("payment_failed");
    // Callback replay must never release an order from the manual resolution queue.
    if (current.status === "needs_review") throw new GuestError("payment_needs_review", 409);
    if (provider.mode === "portone") {
      const receipt = parseReceipt(current.providerReceipt);
      if (current.status === "paid") {
        if (!receipt.consumed || current.providerTransactionId !== result.transactionId) return paymentFailed();
        return current;
      }
      if (receipt.consumed) return paymentFailed();
      // One authoritative ownership lookup, backed by the DB unique constraint
      // and P2002 handling below for concurrent claims by different identities.
      const other = await tx.guestMonitoringOrder.findUnique({ where: { providerTransactionId: result.transactionId }, select: { orderId: true } });
      if (other && other.orderId !== current.orderId) return paymentFailed();
      const recorded = await tx.guestMonitoringOrder.updateMany({ where: {
        id: current.id, providerReceipt: current.providerReceipt, appliedAt: null,
        status: { notIn: ["paid", "needs_review", "refunded", "canceled"] },
      }, data: { status: "paid", paidAt: new Date(result.paidAt), providerTransactionId: result.transactionId,
        providerReceipt: encodeReceipt({ ...receipt, consumed: true }) } });
      if (recorded.count !== 1) {
        const latest = await tx.guestMonitoringOrder.findUniqueOrThrow({ where: { id: current.id } });
        if (latest.status === "paid" && latest.providerTransactionId === result.transactionId &&
            parseReceipt(latest.providerReceipt).consumed) return latest;
        return paymentFailed();
      }
      await tx.auditLog.create({ data: { action: "GUEST_PAYMENT_RECORDED", target: current.orderId } });
      return tx.guestMonitoringOrder.findUniqueOrThrow({ where: { id: current.id } });
    }
    return tx.guestMonitoringOrder.update({ where: { id: current.id }, data: {
      status: "paid", paidAt: new Date(result.paidAt), providerTransactionId: result.transactionId,
      providerReceipt: provider.mode === "mock" ? result.verificationReference : null,
    } });
  }); } catch (error) {
    if (provider.mode === "portone" && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return paymentFailed();
    throw error;
  }
}
