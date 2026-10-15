import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { getPortoneV1Config } from "@/lib/danal/portone-v1-config";
import { findImpUidByMerchantUid } from "@/lib/danal/iamport-rest";
import { parseReceipt, signCallbackContext } from "@/lib/danal/portone-callback";
import { GuestError, notFound, unavailable } from "./errors";
import { resourceId } from "./schemas";
import { guestLimit } from "./rate-limit-keys";
import { paymentCallback } from "./payment-callback";
import type { OrderPrincipal } from "./order";
/** Body-free POST payment/callback?recoverOrderId=... invokes this service.
 * Callers must obtain this principal from requireSession, never request JSON.
 */
export async function recoverPendingPayment(session: OrderPrincipal, orderId: string) {
  if (!session?.verifiedIdentityHash || !["apply", "status", "renewal"].includes(session.purpose)) throw new GuestError("session_required", 401);
  if (!resourceId.safeParse(orderId).success) notFound();
  if (getDanalProvider().mode !== "portone_v1") return unavailable();
  const order = await prisma.guestMonitoringOrder.findFirst({ where: {
    orderId, providerMode: "portone_v1", guestMonitoring: { guestIdentityHash: session.verifiedIdentityHash },
  }, select: { orderId: true, status: true, amount: true, currency: true, providerReceipt: true, expiresAt: true } });
  if (!order) notFound();
  if (order.status === "needs_review") throw new GuestError("payment_needs_review", 409);
  if (order.status !== "pending" || order.expiresAt.getTime() <= Date.now()) throw new GuestError("payment_failed", 400);
  await guestLimit("callback:payment", order.orderId, 20);
  const receipt = parseReceipt(order.providerReceipt);
  if (receipt.consumed || order.currency !== "KRW") throw new GuestError("payment_failed", 400);
  const impUid = await findImpUidByMerchantUid(order.orderId);
  if (!impUid) throw new GuestError("payment_pending", 409);
  const signed = signCallbackContext({ v: 1, purpose: "guest_payment_v1", paymentId: order.orderId,
    orderId: order.orderId, storeId: getPortoneV1Config().impCode, amount: order.amount,
    currency: "KRW", expiresAt: order.expiresAt.getTime(), nonce: receipt.nonce });
  // Reuse signed ownership, two fresh imp_uid snapshots and atomic recording.
  return paymentCallback({ paymentId: order.orderId, imp_uid: impUid, ...signed }, session);
}
