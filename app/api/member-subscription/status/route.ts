import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, requireUser, memberRateLimit } from "@/lib/member-subscription/http";
import { memberSubscriptionStatus } from "@/lib/member-subscription/status";
export async function GET() {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberRateLimit(userId, "read", 120);
    return memberJson(await memberSubscriptionStatus(userId));
  });
}
