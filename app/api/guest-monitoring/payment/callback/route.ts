import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { paymentCallback } from "@/lib/guest-monitoring/activation";
import { getDanalProvider } from "@/lib/danal";
import { requireSession } from "@/lib/guest-monitoring/session";
import { validateOrigin } from "@/lib/csrf";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { resolvePaymentMode } from "@/lib/danal/portone-v1-config";
import { recoverPendingPayment } from "@/lib/guest-monitoring/recover-pending-payment";
import { guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
export const POST = endpoint(async req => {
  let session;
  const mode = resolvePaymentMode();
  if (mode === "portone_v1") {
    // Ignore Referer fallback when an explicit Origin is hostile.
    const origin = req.headers.get("origin");
    const originOnly = new Request(req.url, { method: "POST", headers: origin ? { origin } : {} });
    if (!origin || validateOrigin(originOnly)) throw new GuestError("forbidden", 403);
    session = await requireSession(req, ["apply", "status", "renewal"]);
  }
  // Body-free recovery: POST .../payment/callback?recoverOrderId=ord_...
  // The principal always comes from the verified session, never request JSON.
  const recoveryIds = req.nextUrl.searchParams.getAll("recoverOrderId");
  if (recoveryIds.length) {
    if (mode !== "portone_v1" || !session || recoveryIds.length !== 1 || req.body !== null) {
      throw new GuestError("invalid_input", 400);
    }
    await guestLimit("callback:payment", session.id, 20);
    return json(await recoverPendingPayment(session, recoveryIds[0]));
  }
  let body;
  try { body = await readJson(req); }
  catch (error) {
    if (mode === "portone_v1" && error instanceof GuestError && error.code === "invalid_input") {
      throw new GuestError("payment_failed", 400);
    }
    throw error;
  }
  getDanalProvider();
  return json(await paymentCallback(body, session));
}, { callback: true });
