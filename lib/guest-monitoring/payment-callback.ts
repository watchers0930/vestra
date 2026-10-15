import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { callbackRequestSchema, paymentFailed } from "@/lib/danal/portone-callback";
import { PortoneTerminalPayment } from "@/lib/danal/portone-payment";
import type { OrderPrincipal } from "./order";
import { GuestError } from "./errors";
import { guestLimit } from "./rate-limit-keys";
import { recordTerminalPayment } from "./record-terminal-payment";
import { recordPayment } from "./record-payment";
import { applyPaidOrder } from "./activation";
export async function paymentCallback(input: unknown, session?: OrderPrincipal) {
  const provider = getDanalProvider();
  if (provider.mode === "portone") {
    if (!session || !["apply", "renewal"].includes(session.purpose)) throw new GuestError("session_required", 401);
    const body = callbackRequestSchema.safeParse(input);
    if (!body.success) return paymentFailed();
    const owned = await prisma.guestMonitoringOrder.findFirst({ where: {
      orderId: body.data.paymentId, providerMode: "portone",
      guestMonitoring: { guestIdentityHash: session.verifiedIdentityHash },
    }, select: { orderId: true } });
    if (!owned) throw new GuestError("not_found", 404);
  }
  let callback;
  try { callback = await provider.payment.verifyPayment(input); }
  catch (error) {
    if (provider.mode !== "portone" || !(error instanceof PortoneTerminalPayment)) throw error;
    await guestLimit("callback:payment", error.orderId, 20);
    // Design §3.3/§4.4 requires a fresh second snapshot before recording.
    // Do not cache either read: a payment can transition after verification.
    try { await provider.payment.getPayment(error.orderId); }
    catch (confirmed) {
      if (confirmed instanceof PortoneTerminalPayment && confirmed.orderId === error.orderId &&
          confirmed.transactionId === error.transactionId && confirmed.paymentStatus === error.paymentStatus) {
        await recordTerminalPayment(confirmed);
        return { ok: true };
      }
      throw confirmed;
    }
    return paymentFailed(); // Status changed between reads; retry rather than save stale failure.
  }
  await guestLimit("callback:payment", callback.orderId, 20);
  // Deliberate second REST read (design §3.3/§4.4), not a redundant lookup.
  // recordPayment only checks current DB state; it makes no provider REST call.
  const verified = await provider.payment.getPayment(callback.verificationReference || callback.transactionId);
  if (verified.orderId !== callback.orderId || verified.transactionId !== callback.transactionId) throw new GuestError("payment_failed");
  const paid = await recordPayment(verified);
  if (paid) await applyPaidOrder(paid.orderId);
  return { ok: true };
}
