import { fail } from "./errors";
import { MEMBER_POLICY_VERSION, MEMBER_PRICE_VERSION } from "./pricing";
export function memberReleaseConfig() {
  const effective = process.env.MEMBER_POLICY_EFFECTIVE_AT;
  const effectiveAt = effective ? new Date(effective) : null;
  if (process.env.MEMBER_SUBSCRIPTION_ENABLED !== "true" || !MEMBER_POLICY_VERSION || !MEMBER_PRICE_VERSION ||
      !effectiveAt || !Number.isFinite(effectiveAt.getTime()) || effectiveAt > new Date()) fail("provider_unavailable");
  return { priceVersion: MEMBER_PRICE_VERSION, policyVersion: MEMBER_POLICY_VERSION, effectiveAt };
}
