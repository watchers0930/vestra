import { NextRequest } from "next/server";
import { endpoint, json } from "@/lib/guest-monitoring/http";
import { requireSession } from "@/lib/guest-monitoring/session";
import { guestLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { getCalendar } from "@/lib/guest-monitoring/calendar-dto";
import { kstMonth } from "@/lib/guest-monitoring/period";
import { monthSchema, resourceId } from "@/lib/guest-monitoring/schemas";
import { GuestError, notFound } from "@/lib/guest-monitoring/errors";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return endpoint(async request => {
    const session = await requireSession(request, ["status", "renewal"]);
    await guestLimit("read", session.id, 30);
    const { id } = await context.params;
    if (!resourceId.safeParse(id).success) notFound();
    const month = monthSchema.safeParse(request.nextUrl.searchParams.get("month") ?? kstMonth());
    if (!month.success) throw new GuestError("invalid_input");
    return json(await getCalendar(session.verifiedIdentityHash, id, month.data));
  })(req);
}
