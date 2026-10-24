import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { callbackRequestSchema, paymentFailed, verifyCallbackContext } from "@/lib/danal/portone-callback";
import type { OrderPrincipal } from "./order";
import { GuestError } from "./errors";
import { guestLimit } from "./rate-limit-keys";
import { recordPayment } from "./record-payment";
import { applyPaidOrder } from "./activation";
import { verifyGuestPayment } from "./verify-guest-payment";

export async function paymentCallback(input: unknown, session?: OrderPrincipal) {
  const provider = getDanalProvider();
  if (provider.mode === "portone_v1") {
    // 다날 실결제(V1 SDK) 콜백 — 검증은 V2 API로(결제가 V2 스토어에 저장됨). V1 REST 조회는 404로 멈춤.
    if (!session || !["apply", "status", "renewal"].includes(session.purpose)) throw new GuestError("session_required", 401);
    const body = callbackRequestSchema.safeParse(input);
    if (!body.success) return paymentFailed();
    // 콜백 서명 검증(context 무결성). throw on fail.
    const context = verifyCallbackContext(input);
    await guestLimit("callback:payment", body.data.paymentId, 20);
    const owned = await prisma.guestMonitoringOrder.findFirst({ where: {
      orderId: body.data.paymentId, providerMode: "portone_v1",
      guestMonitoring: { guestIdentityHash: session.verifiedIdentityHash },
    } });
    if (!owned) throw new GuestError("not_found", 404);
    console.log("[guest-payment-v2] callback received", { orderId: owned.orderId });
    // context를 주문에 바인딩 + V2 API 이중조회·검증(상태 변화 감지).
    const verified = await verifyGuestPayment(owned, context);
    const paid = await recordPayment(verified);
    if (paid) await applyPaidOrder(paid.orderId);
    return { ok: true };
  }
  // mock 경로(로컬 격리 테스트) — 자체 완결 verificationReference(receipt)로 2차 조회.
  const callback = await provider.payment.verifyPayment(input);
  await guestLimit("callback:payment", callback.orderId, 20);
  const secondReadRef = callback.verificationReference || callback.transactionId;
  const verified = await provider.payment.getPayment(secondReadRef);
  if (verified.orderId !== callback.orderId || verified.transactionId !== callback.transactionId) throw new GuestError("payment_failed");
  const paid = await recordPayment(verified);
  if (paid) await applyPaidOrder(paid.orderId);
  return { ok: true };
}
