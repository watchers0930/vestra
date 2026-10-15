import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { identityStartSchema } from "@/lib/guest-monitoring/schemas";
import { guestIdentityHash } from "@/lib/guest-monitoring/identity-hash";
import { startIdentity, attachBrowser } from "@/lib/guest-monitoring/session";
import { ipLimit, guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { getDanalProvider } from "@/lib/danal";
export const POST = endpoint(async req => {
  getDanalProvider();
  await ipLimit(req, "identity", 5, 600_000);
  const input = identityStartSchema.safeParse(await readJson(req));
  if (!input.success) throw new GuestError("invalid_input");
  await guestLimit("identity", guestIdentityHash(input.data.guestName, input.data.guestPhone), 3, 600_000);
  // Global daily cost cap, independent of IP/session. Missing config uses a conservative cap.
  const configured = Number(process.env.GUEST_IDENTITY_DAILY_LIMIT || 100);
  const cap = Number.isInteger(configured) && configured > 0 ? Math.min(configured, 1000) : 100;
  await guestLimit("identity-cost", new Date().toISOString().slice(0, 10), cap, 86400_000);
  const result = await startIdentity(req, input.data);
  const response = json(result.data);
  attachBrowser(response, result.browser);
  return response;
});
