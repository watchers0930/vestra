import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberMutation, memberBody, memberRateLimit } from "@/lib/member-subscription/http";
import { recoverSchema, orderIdSchema } from "@/lib/member-subscription/schemas";
import { recoverMemberOrder } from "@/lib/member-subscription/recovery";
import { fail } from "@/lib/member-subscription/errors";
export const maxDuration = 60;
export async function POST(req: Request, context: { params: Promise<{ orderId: string }> }) {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberMutation(req, userId);
    const { orderId } = await context.params;
    if (!orderIdSchema.safeParse(orderId).success) fail("not_found");
    const input = await memberBody(req, recoverSchema);
    await memberRateLimit(userId, `order:${orderId}`, 15);
    return memberJson(await recoverMemberOrder(userId, orderId, input.imp_uid));
  });
}
