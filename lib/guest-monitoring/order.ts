import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { GUEST_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { getDanalProvider } from "@/lib/danal";
import type { GuestOrderRequest, GuestOrderStatus } from "@/types/guest-monitoring";
import { GuestError, notFound } from "./errors";
import { assertApplicantRole } from "./applicant-gate";
import { locked } from "./transaction";
import { ORDER_TTL } from "./config";
import { assertDecrypted } from "./config";
export interface OrderPrincipal { verifiedIdentityHash: string; purpose: string; draftId: string | null }
export async function createOrder(session: OrderPrincipal, input: GuestOrderRequest) {
  const provider = getDanalProvider();
  if (input.purpose === "initial" ? session.purpose !== "apply" || session.draftId !== input.draftId :
      !["status", "renewal"].includes(session.purpose)) notFound();
  const id = (input.purpose === "initial" ? input.draftId : input.guestMonitoringId)!;
  const result = await locked(session.verifiedIdentityHash, async tx => {
    const property = await tx.guestMonitoring.findFirst({ where: { id, guestIdentityHash: session.verifiedIdentityHash } });
    if (!property) notFound();
    const existing = await tx.guestMonitoringOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.guestMonitoringId !== id || existing.purpose !== input.purpose) notFound();
      return { order: existing, created: false };
    }
    if (input.purpose === "initial") assertApplicantRole(property);
    const now = new Date();
    // One unfinished order per property, even across different request keys.
    const pending = await tx.guestMonitoringOrder.findFirst({ where: {
      ...(input.purpose === "initial" && property.commUniqueNo ? { guestMonitoring: {
        guestIdentityHash: session.verifiedIdentityHash, commUniqueNo: property.commUniqueNo,
      } } : { guestMonitoringId: id }), purpose: input.purpose,
      OR: [{ status: "pending", expiresAt: { gt: now } }, { status: { in: ["paid", "needs_review"] }, appliedAt: null }],
    }, orderBy: { createdAt: "asc" } });
    if (pending) return { order: pending, created: false };
    if (input.purpose === "initial") {
      if (property.status !== "pending_payment" || !property.draftExpiresAt || property.draftExpiresAt <= now) throw new GuestError("draft_expired");
      assertDecrypted(property.ownerName);
      if (!property.commUniqueNo) throw new GuestError("extraction_incomplete");
      const duplicate = await tx.guestMonitoring.findFirst({ where: {
        guestIdentityHash: property.guestIdentityHash, commUniqueNo: property.commUniqueNo,
        status: "active", paidUntil: { gt: now }, id: { not: id },
      }, select: { id: true } });
      if (duplicate) throw new GuestError("duplicate_active", 409);
    } else if (!["active", "expired"].includes(property.status) || !property.startedAt || !property.paidUntil) notFound();
    await tx.guestMonitoringOrder.updateMany({ where: { guestMonitoringId: id, status: "pending", expiresAt: { lte: now } }, data: { status: "failed" } });
    const order = await tx.guestMonitoringOrder.create({ data: {
      orderId: `ord_${randomUUID().replace(/-/g, "")}`, guestMonitoringId: id, purpose: input.purpose,
      amount: product.amount, currency: product.currency, productVersion: product.priceVersion,
      providerMode: provider.mode, idempotencyKey: input.idempotencyKey,
      expiresAt: new Date(now.getTime() + ORDER_TTL),
    } });
    return { order, created: true };
  });
  const { order } = result;
  if (order.providerMode !== provider.mode) throw new GuestError("provider_unavailable", 503);
  const payment = order.status === "pending" && order.expiresAt > new Date()
    ? await provider.payment.createPayment(order) : {};
  return { data: { orderId: order.orderId, amount: order.amount, currency: order.currency,
    payment, status: order.status as GuestOrderStatus }, created: result.created };
}
export async function getOrder(identity: string, orderId: string) {
  const order = await prisma.guestMonitoringOrder.findFirst({ where: {
    orderId, guestMonitoring: { guestIdentityHash: identity },
  }, select: { orderId: true, status: true, appliedAt: true,
    guestMonitoring: { select: { startedAt: true, paidUntil: true } } } });
  if (!order) notFound();
  return { orderId: order.orderId, status: order.status, applied: !!order.appliedAt,
    startedAt: order.guestMonitoring.startedAt?.toISOString() || null,
    paidUntil: order.guestMonitoring.paidUntil?.toISOString() || null };
}
