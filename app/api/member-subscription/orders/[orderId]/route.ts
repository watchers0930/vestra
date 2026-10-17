import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberRateLimit } from "@/lib/member-subscription/http";
import { ownedOrder, orderStatus } from "@/lib/member-subscription/orders";
import { orderIdSchema } from "@/lib/member-subscription/schemas";
import { fail } from "@/lib/member-subscription/errors";
export async function GET(req: Request, context: { params: Promise<{ orderId: string }> }) {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberRateLimit(userId, "read", 120);
    const { orderId } = await context.params;
    if (!orderIdSchema.safeParse(orderId).success) fail("not_found");
    return memberJson(orderStatus(await ownedOrder(userId, orderId)));
  });
}
