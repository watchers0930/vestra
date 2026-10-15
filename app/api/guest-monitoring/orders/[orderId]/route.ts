import { NextRequest } from "next/server";
import { endpoint, json } from "@/lib/guest-monitoring/http";
import { requireSession } from "@/lib/guest-monitoring/session";
import { guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { getOrder } from "@/lib/guest-monitoring/order";
import { resourceId } from "@/lib/guest-monitoring/schemas";
import { notFound } from "@/lib/guest-monitoring/errors";
export async function GET(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  return endpoint(async request => {
    const session = await requireSession(request);
    await guestLimit("read", session.id, 30);
    const { orderId } = await context.params;
    if (!resourceId.safeParse(orderId).success) notFound();
    return json(await getOrder(session.verifiedIdentityHash, orderId));
  })(req);
}
