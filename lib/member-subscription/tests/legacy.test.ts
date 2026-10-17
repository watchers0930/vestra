import { afterEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ user: vi.fn(), entitlement: vi.fn(), paid: vi.fn(), limit: vi.fn() }));
vi.mock("../transaction", () => ({ memberTransaction: (_id: string, run: (tx: unknown) => unknown) => run({ user: { findUnique: f.user } }) }));
vi.mock("../policy", () => ({ resolveEffectiveEntitlement: f.entitlement }));
vi.mock("@/lib/subscription-guard", () => ({ isPaidMember: f.paid, getMonitoringLimit: f.limit }));
import { withLegacySubscriptionChange } from "../legacy-guards";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
it("protects an existing prepaid term even when new member ordering is disabled", async () => {
  vi.stubEnv("MEMBER_SUBSCRIPTION_ENABLED", "false");
  f.user.mockResolvedValue({ role: "PERSONAL", subscription: { policyVersion: "fixture" }, membershipPolicy: null });
  const write = vi.fn();
  await expect(withLegacySubscriptionChange("u1", write)).rejects.toMatchObject({ code: "forbidden" });
  expect(write).not.toHaveBeenCalled();
});
it("preserves allowed legacy changes and blocks classified business FREE bypass", async () => {
  f.user.mockResolvedValue({ role: "PERSONAL", subscription: { policyVersion: null }, membershipPolicy: null });
  const write = vi.fn().mockResolvedValue({ ok: true });
  expect(await withLegacySubscriptionChange("u1", write)).toEqual({ ok: true });
  f.user.mockResolvedValue({ role: "BUSINESS", subscription: null, membershipPolicy: { grandfatheredAt: null } });
  await expect(withLegacySubscriptionChange("u1", write)).rejects.toMatchObject({ code: "forbidden" });
  expect(write).toHaveBeenCalledTimes(1);
});
