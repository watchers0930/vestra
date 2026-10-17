import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberMutation, memberBody, memberRateLimit } from "@/lib/member-subscription/http";
import { callbackSchema } from "@/lib/member-subscription/schemas";
import { memberPaymentCallback } from "@/lib/member-subscription/payment-callback";
export const maxDuration = 60;
export async function POST(req: Request) {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberMutation(req, userId);
    const input = await memberBody(req, callbackSchema, "payment_failed");
    await memberRateLimit(userId, `order:${input.paymentId}`, 15);
    return memberJson(await memberPaymentCallback(userId, input));
  });
}
