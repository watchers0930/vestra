import { afterEach, beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ users: vi.fn(), counts: vi.fn(), policyVersion: "fixture", priceVersion: "fixture" }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findMany: f.users }, monitoredProperty: { groupBy: f.counts },
} }));
vi.mock("../pricing", async importOriginal => ({
  ...await importOriginal<typeof import("../pricing")>(),
  get MEMBER_POLICY_VERSION() { return f.policyVersion; },
  get MEMBER_PRICE_VERSION() { return f.priceVersion; },
}));
import { filterMemberMonitoringTargets } from "../monitoring-targets";
import { memberMonitoringFilter } from "../legacy-guards";
import type { effectiveEntitlement } from "../policy";
type User = Parameters<typeof effectiveEntitlement>[0] & { createdAt: Date };
const now = new Date("2026-10-16T00:00:00Z");
const policy = { policyVersion: "fixture", grandfatheredAt: null, legacyEntitlementsSnapshot: {} };
function user(overrides: Record<string, unknown> = {}): User {
  return { id: "u1", role: "PERSONAL", verifyStatus: "none", createdAt: new Date("2026-01-01"),
    membershipPolicy: policy, subscription: { plan: "PRO", status: "active", policyVersion: "fixture",
      endDate: new Date(+now + 86_400_000) }, ...overrides } as User;
}
const properties = [{ id: "p1", userId: "u1" }, { id: "p2", userId: "u1" }];
beforeEach(() => {
  vi.clearAllMocks(); f.policyVersion = "fixture"; f.priceVersion = "fixture";
  vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "true");
  vi.stubEnv("MEMBER_POLICY_EFFECTIVE_AT", "2026-01-01T00:00:00Z");
  f.counts.mockResolvedValue([{ userId: "u1", _count: { _all: 2 } }]);
});
afterEach(() => vi.unstubAllEnvs());
it("keeps the empty path query-free", async () => {
  expect(await filterMemberMonitoringTargets([], now)).toEqual([]);
  expect(f.users).not.toHaveBeenCalled(); expect(f.counts).not.toHaveBeenCalled();
});
it("enforces a lapsed classified member even when the ordering flag is off (fail-safe net)", async () => {
  // The flag gates new ordering, never expiry: a classified, non-grandfathered expired term
  // must still be excluded so the shared batch cannot keep monitoring a lapsed member.
  vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "false");
  f.users.mockResolvedValue([user({ subscription: { ...user().subscription, status: "expired", endDate: new Date(0) } })]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
});
it.each(["PERSONAL", "RENTAL_BIZ", "BUSINESS", "REALESTATE", "ADMIN"])("uses authoritative state boundaries for %s", async role => {
  for (const status of ["active", "trialing", "grace", "expired", "locked", "canceled"]) {
    for (const days of [-8, -7, -1, 0, 1]) {
      const end = new Date(+now + days * 86_400_000);
      const u = user({ role, verifyStatus: "verified", subscription: {
        ...user().subscription, status, endDate: end, trialEndsAt: end,
      } });
      f.users.mockResolvedValue([u]);
      expect(memberMonitoringFilter()).toEqual({});
      const allowed = role === "ADMIN" || (status !== "canceled" && (role === "PERSONAL" ? days > 0 : days > -7));
      expect(await filterMemberMonitoringTargets(properties, now)).toEqual(allowed ? properties : []);
    }
  }
});
it.each([{}, null, { monitoringLimit: -1 }, { monitoringLimit: "5" }])("retains legacy rights with incomplete baseline %j", async snapshot => {
  f.users.mockResolvedValue([user({ membershipPolicy: { ...policy, grandfatheredAt: now, legacyEntitlementsSnapshot: snapshot },
    subscription: { ...user().subscription, policyVersion: null, endDate: new Date(0) } })]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual(properties);
  expect(f.users).toHaveBeenCalledTimes(1); expect(f.counts).toHaveBeenCalledTimes(1);
  expect(f.users.mock.calls[0][0].where.id.in).toEqual(["u1"]);
});
it("never restricts unclassified owners (registration gates them) but drops missing owners", async () => {
  // Unclassified owners — legacy or not-yet-taken-over — are always preserved by the member
  // filter regardless of createdAt; only classified lapsed members are the filter's concern.
  for (const createdAt of [new Date("2025-01-01"), new Date("2026-01-01")]) {
    f.users.mockResolvedValue([user({ membershipPolicy: null, createdAt, subscription: null })]);
    expect(await filterMemberMonitoringTargets(properties, now)).toEqual(properties);
  }
  f.users.mockResolvedValue([]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
});
it("rejects revoked verification and over-limit owners using global active counts", async () => {
  f.users.mockResolvedValue([user({ role: "BUSINESS", verifyStatus: "none" })]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
  f.users.mockResolvedValue([user()]); f.counts.mockResolvedValue([{ userId: "u1", _count: { _all: 6 } }]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
});

it.each(["policyVersion", "priceVersion"] as const)("enforces classified members independent of release config (%s missing)", async field => {
  // The fail-safe net no longer depends on the release config: a lapsed classified member
  // is excluded even if the rollout versions are unset (enforcement lives in entitlement state).
  f[field] = "";
  f.users.mockResolvedValue([user({ subscription: { ...user().subscription, status: "expired", endDate: new Date(0) } })]);
  expect(await filterMemberMonitoringTargets(properties, now)).toEqual([]);
  expect(f.users).toHaveBeenCalled();
});
it("does not silently bypass entitlement checks after a database failure", async () => {
  const failure = new Error("fixture database failure");
  f.users.mockRejectedValue(failure);
  await expect(filterMemberMonitoringTargets(properties, now)).rejects.toBe(failure);
});
