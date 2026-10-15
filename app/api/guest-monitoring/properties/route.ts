import { endpoint, json } from "@/lib/guest-monitoring/http";
import { requireSession } from "@/lib/guest-monitoring/session";
import { guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { listProperties } from "@/lib/guest-monitoring/calendar-dto";
export const GET = endpoint(async req => {
  const session = await requireSession(req, ["status", "renewal"]);
  await guestLimit("read", session.id, 30);
  return json(await listProperties(session.verifiedIdentityHash));
});
