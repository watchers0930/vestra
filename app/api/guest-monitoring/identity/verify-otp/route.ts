import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { otpVerifySchema } from "@/lib/guest-monitoring/schemas";
import { resolveIdentityMode } from "@/lib/guest-monitoring/identity-mode";
import { verifyOtp } from "@/lib/guest-monitoring/sms-otp";
import { attachBrowser, attachSession } from "@/lib/guest-monitoring/session";
import { GuestError, notFound } from "@/lib/guest-monitoring/errors";

export const POST = endpoint(async req => {
  if (resolveIdentityMode() !== "sms_otp") notFound();
  const input = otpVerifySchema.safeParse(await readJson(req));
  if (!input.success) throw new GuestError("invalid_input");
  const result = await verifyOtp(req, input.data);
  const response = json({ ok: true, purpose: result.purpose });
  attachSession(response, result.rawToken);
  attachBrowser(response, result.browser);
  return response;
});
