import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { paymentCallback } from "@/lib/guest-monitoring/activation";
import { getDanalProvider } from "@/lib/danal";
import { requireSession } from "@/lib/guest-monitoring/session";
import { validateOrigin } from "@/lib/csrf";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { resolvePaymentMode } from "@/lib/danal/portone-config";
export const POST = endpoint(async req => {
  let session;
  const mode = resolvePaymentMode();
  if (mode === "portone") {
    // Ignore Referer fallback when an explicit Origin is hostile.
    const origin = req.headers.get("origin");
    const originOnly = new Request(req.url, { method: "POST", headers: origin ? { origin } : {} });
    if (!origin || validateOrigin(originOnly)) throw new GuestError("forbidden", 403);
    session = await requireSession(req, ["apply", "renewal"]);
  }
  getDanalProvider();
  let body;
  try { body = await readJson(req); }
  catch (error) {
    if (mode === "portone" && error instanceof GuestError && error.code === "invalid_input") {
      throw new GuestError("payment_failed", 400);
    }
    throw error;
  }
  return json(await paymentCallback(body, session));
}, { callback: true });
