import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { callbackRequestSchema, paymentFailed } from "@/lib/danal/portone-callback";
import { PortoneTerminalPayment } from "@/lib/danal/portone-v1-payment";
import type { OrderPrincipal } from "./order";
import { GuestError } from "./errors";
import { guestLimit } from "./rate-limit-keys";
import { recordTerminalPayment } from "./record-terminal-payment";
import { recordPayment } from "./record-payment";
import { applyPaidOrder } from "./activation";
export async function paymentCallback(input: unknown, session?: OrderPrincipal) {
  const provider = getDanalProvider();
  if (provider.mode === "portone_v1") {
    if (!session || !["apply", "status", "renewal"].includes(session.purpose)) throw new GuestError("session_required", 401);
    const body = callbackRequestSchema.safeParse(input);
    if (!body.success) return paymentFailed();
    const owned = await prisma.guestMonitoringOrder.findFirst({ where: {
      orderId: body.data.paymentId, providerMode: "portone_v1",
      guestMonitoring: { guestIdentityHash: session.verifiedIdentityHash },
    }, select: { orderId: true } });
    if (!owned) throw new GuestError("not_found", 404);
  }
  let callback;
  try { callback = await provider.payment.verifyPayment(input); }
  catch (error) {
    if (provider.mode !== "portone_v1" || !(error instanceof PortoneTerminalPayment)) throw error;
    await guestLimit("callback:payment", error.orderId, 20);
    // Design §3.3/§4.4 requires a fresh second snapshot before recording.
    // Do not cache either read: a payment can transition after verification.
    // getPayment은 orderId(merchant_uid)로 재조회한다(아임포트 테스트 imp_uid 직접조회 불가).
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
  // portone_v1은 orderId(merchant_uid)로 재조회(imp_uid 직접조회 불가, 기록 전이라 providerTransactionId
  // 미설정). mock은 자체 완결된 verificationReference(receipt)로 조회. 어느 경우든 반환 결제의
  // transactionId가 1차 콜백과 일치하는지 교차대조해 다른 결제로 바꿔치기할 수 없게 한다.
  const secondReadRef = provider.mode === "portone_v1" ? callback.orderId : (callback.verificationReference || callback.transactionId);
  const verified = await provider.payment.getPayment(secondReadRef);
  if (verified.orderId !== callback.orderId || verified.transactionId !== callback.transactionId) throw new GuestError("payment_failed");
  const paid = await recordPayment(verified);
  if (paid) await applyPaidOrder(paid.orderId);
  return { ok: true };
}
