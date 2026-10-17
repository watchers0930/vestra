import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberMutation, memberBody } from "@/lib/member-subscription/http";
import { orderSchema } from "@/lib/member-subscription/schemas";
import { createMemberOrder } from "@/lib/member-subscription/orders";
export async function POST(req: Request) {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberMutation(req, userId);
    const input = await memberBody(req, orderSchema);
    return memberJson(await createMemberOrder(userId, input), 201);
  });
}
