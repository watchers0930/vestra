import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MemberSubscriptionPolicy, Subscription } from "@prisma/client";
import type { MemberTransaction } from "../transaction";

const f = vi.hoisted(() => ({
  find: vi.fn(), users: vi.fn(), counts: vi.fn(), transaction: vi.fn(),
  policyVersion: "fixture-policy", priceVersion: "fixture-price",
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: f.transaction, user: { findMany: f.users }, monitoredProperty: { groupBy: f.counts },
} }));
vi.mock("../pricing", async importOriginal => ({
  ...await importOriginal<typeof import("../pricing")>(),
  get MEMBER_POLICY_VERSION() { return f.policyVersion; },
  get MEMBER_PRICE_VERSION() { return f.priceVersion; },
}));
import { memberReleaseConfig } from "../config";
import { resolveOnboardingState } from "../onboarding";
import { onboardingAccessResponse } from "../onboarding-access";
import { filterMemberMonitoringTargets } from "../monitoring-targets";

const now = new Date("2026-10-20T00:00:00Z");
const user = {
  id: "fixture-user", role: "BUSINESS", requestedRole: null, verifyStatus: "verified",
  createdAt: new Date("2026-10-19T00:00:00Z"),
  membershipPolicy: null as MemberSubscriptionPolicy | null, subscription: null as Subscription | null,
};
const db = { user: { findUnique: f.find } } as unknown as MemberTransaction;
const properties = [{ id: "fixture-property", userId: user.id }];
const protectedUrl = new URL("https://vestra.ai.kr/dashboard");
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "true");
  vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "2026-10-18T00:00:00Z");
  f.policyVersion = "fixture-policy";
  f.priceVersion = "fixture-price";
  f.find.mockResolvedValue(user);
  f.transaction.mockImplementation(run => run(db));
  f.users.mockResolvedValue([user]);
  f.counts.mockResolvedValue([{ userId: user.id, _count: { _all: 1 } }]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

const unreleased = ["disabled", "policy-missing", "price-missing", "future", "date-missing", "date-invalid"] as const;
function disableRelease(reason: typeof unreleased[number]) {
  if (reason === "disabled") vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "false");
  if (reason === "policy-missing") f.policyVersion = "";
  if (reason === "price-missing") f.priceVersion = "";
  if (reason === "future") vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "2026-10-21T00:00:00Z");
  if (reason === "date-missing") vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "");
  if (reason === "date-invalid") vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "invalid-date");
}

it.each(unreleased)("preserves unclassified signup access when release is %s", async reason => {
  disableRelease(reason);
  expect(() => memberReleaseConfig()).toThrow(expect.objectContaining({ code: "provider_unavailable" }));
  for (const role of ["BUSINESS", "REALESTATE"]) {
    f.find.mockResolvedValue({ ...user, role });
    f.users.mockResolvedValue([{ ...user, role }]);
    expect(await resolveOnboardingState(user.id, now, db)).toMatchObject({
      isNewSignup: false, complete: true, requiresPaid: true,
    });
    expect(await onboardingAccessResponse(user.id, protectedUrl)).toBeNull();
    expect(await filterMemberMonitoringTargets(properties, now)).toEqual(properties);
  }
});
it.each(unreleased)("continues enforcing classified expired members when release is %s", async reason => {
  disableRelease(reason);
  const expiredUser = {
    ...user,
    membershipPolicy: { policyVersion: "fixture-policy", grandfatheredAt: null, legacyEntitlementsSnapshot: {} },
    subscription: { plan: "PREMIUM", status: "expired", policyVersion: "fixture-policy", endDate: new Date("2026-10-01") },
  };
  f.users.mockResolvedValue([expiredUser]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
  expect(f.users).toHaveBeenCalledOnce();
});
it("activates new-signup protection at the exact effective time", async () => {
  vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", now.toISOString());
  f.find.mockResolvedValue({ ...user, createdAt: now });
  expect(memberReleaseConfig().effectiveAt).toEqual(now);
  expect(await resolveOnboardingState(user.id, now, db)).toMatchObject({ isNewSignup: true, complete: false, stage: "pay" });
  const response = await onboardingAccessResponse(user.id, protectedUrl);
  expect(response?.status).toBe(307);
  expect(response?.headers.get("location")).toBe("https://vestra.ai.kr/signup/business/step-3");
  f.find.mockResolvedValue({ ...user, createdAt: new Date(+now - 1) });
  expect(await onboardingAccessResponse(user.id, protectedUrl)).toBeNull();
});
