import { endpoint, json } from "@/lib/guest-monitoring/http";
import { revokeSession } from "@/lib/guest-monitoring/session";
export const DELETE = endpoint(async req => {
  const response = json({ ok: true });
  await revokeSession(req, response);
  return response;
});
