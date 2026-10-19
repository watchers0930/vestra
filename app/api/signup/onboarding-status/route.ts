import { auth } from "@/lib/auth";
import { memberEndpoint, memberJson, memberRateLimit, requireUser } from "@/lib/member-subscription/http";
import { resolveOnboardingState } from "@/lib/member-subscription/onboarding";

/**
 * Failures: 401 unauthorized session/deleted user, 403 forbidden for a persisted
 * GUEST or unsupported role (no member onboarding contract), 429 read limit,
 * 503 unavailable storage. A disabled release keeps supported-role reads open.
 */
export async function GET() {
  return memberEndpoint(async () => {
    const userId = requireUser(await auth());
    await memberRateLimit(userId, "read", 120);
    return memberJson(await resolveOnboardingState(userId));
  });
}
