import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { requireSession } from "@/lib/guest-monitoring/session";
import { guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { orderSchema } from "@/lib/guest-monitoring/schemas";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { createOrder } from "@/lib/guest-monitoring/order";
import { getDanalProvider } from "@/lib/danal";
export const POST = endpoint(async req => {
  getDanalProvider();
  const session = await requireSession(req);
  await guestLimit("orders", session.id, 5);
  const input = orderSchema.safeParse(await readJson(req));
  if (!input.success) throw new GuestError("invalid_input");
  const result = await createOrder(session, input.data);
  return json(result.data, result.created ? 201 : 200);
});
