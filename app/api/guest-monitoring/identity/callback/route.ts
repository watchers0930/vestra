import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { consumeIdentity, attachSession, attachBrowser, BROWSER_COOKIE } from "@/lib/guest-monitoring/session";
import { getDanalProvider } from "@/lib/danal";
import { GuestError } from "@/lib/guest-monitoring/errors";
export const POST = endpoint(async req => {
  getDanalProvider();
  try {
    const result = await consumeIdentity(req, await readJson(req));
    const redirect = result.purpose === "apply" ? "/renewal/monitoring/guest/apply" : "/renewal/monitoring/guest/status";
    const response = json({ ok: true, redirect });
    attachSession(response, result.rawToken);
    attachBrowser(response, req.cookies.get(BROWSER_COOKIE)!.value);
    return response;
  } catch (error) {
    if (error instanceof GuestError && error.code === "rate_limited") throw error;
    return json({ ok: false, code: "verification_failed" });
  }
}, { callback: true });
