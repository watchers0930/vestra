import { beforeEach, expect, it, vi } from "vitest";
import type { MemberSubscriptionPolicy, Subscription } from "@prisma/client";
const f = vi.hoisted(() => ({ find: vi.fn(), transaction: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: f.transaction } }));
vi.mock("../config", () => ({ memberReleaseConfig: f.release }));
import { decideOnboarding, requiresPaidToComplete, resolveOnboardingState, requireOnboardingComplete } from "../onboarding";
import { assertPlanAllowed, effectiveEntitlement } from "../policy";
import { ROLE_ALLOWED_PLANS, ROLE_FREE_ALLOWED } from "../pricing";
import type { MemberTransaction } from "../transaction";
const now = new Date("2026-10-19T00:00:00Z");
const effectiveAt = new Date("2026-10-18T00:00:00Z");
const facts = { role: "BUSINESS", requestedRole: null, verifyStatus: "verified", premiumActive: false, isNewSignup: true };
const user = { id: "u1", role: "BUSINESS", requestedRole: null, verifyStatus: "verified", createdAt: now,
  subscription: null as Subscription | null, membershipPolicy: null as MemberSubscriptionPolicy | null };
const subscription = { plan: "PREMIUM", status: "active", policyVersion: "v1", endDate: new Date("2027-01-01") } as Subscription;
const db = { user: { findUnique: f.find } } as unknown as MemberTransaction;
beforeEach(() => {
  vi.clearAllMocks();
  f.find.mockImplementation(async ({ select }) => select.requestedRole ? { requestedRole: user.requestedRole } : user);
  f.transaction.mockImplementation(run => run(db));
  f.release.mockReturnValue({ effectiveAt });
});
it.each([
  [{ role: "PERSONAL" }, "complete"],
  [{ role: "RENTAL_BIZ" }, "complete"],
  [{ role: "RENTAL_BIZ", verifyStatus: "pending" }, "verify"],
  [{}, "pay"],
  [{ premiumActive: true }, "complete"],
  [{ role: "REALESTATE" }, "pay"],
  [{ role: "REALESTATE", premiumActive: true }, "complete"],
  [{ role: "ADMIN", requestedRole: "BUSINESS", verifyStatus: "pending" }, "complete"],
  [{ role: "LAWYER" }, "complete"],
  [{ isNewSignup: false, verifyStatus: "none" }, "complete"],
] as const)("decides normalized server facts %j", (patch, stage) => {
  expect(decideOnboarding({ ...facts, ...patch })).toEqual({ stage, complete: stage === "complete" });
});
it.each(["RENTAL_BIZ", "REALESTATE", "BUSINESS"])("never mistakes pending %s for personal FREE completion", requestedRole => {
  for (const verifyStatus of ["none", "pending", "rejected"]) {
    expect(decideOnboarding({ ...facts, role: "PERSONAL", requestedRole, verifyStatus }).stage).toBe("verify");
  }
});
it("keeps free roles accessible independently of optional payment", () => {
  for (const role of ["PERSONAL", "RENTAL_BIZ"]) {
    expect(requiresPaidToComplete(role)).toBe(false);
    expect(decideOnboarding({ ...facts, role }).complete).toBe(true);
  }
});
it("enforces plan eligibility and verification without adding FREE to paid plans", () => {
  expect(ROLE_FREE_ALLOWED).toEqual({ PERSONAL: true, RENTAL_BIZ: true, BUSINESS: false, REALESTATE: false });
  for (const role of ["BUSINESS", "REALESTATE"] as const) {
    expect(ROLE_ALLOWED_PLANS[role]).toEqual(["PREMIUM"]);
    expect(() => assertPlanAllowed(role, "PRO", "verified")).toThrow(expect.objectContaining({ code: "plan_not_allowed" }));
    expect(() => assertPlanAllowed(role, "PREMIUM", "pending")).toThrow(expect.objectContaining({ code: "verification_required" }));
    expect(() => assertPlanAllowed(role, "PREMIUM", "verified")).not.toThrow();
  }
});
it("returns the exact response fields from a consistent read-only snapshot", async () => {
  expect(await resolveOnboardingState("u1", now)).toEqual({ stage: "pay", complete: false, requiresPaid: true,
    role: "BUSINESS", verifyStatus: "verified", premiumActive: false, isNewSignup: true,
    allowedPlans: ["PREMIUM"], freeAllowed: false });
  expect(f.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead", timeout: 5000 });
  expect(f.find).toHaveBeenCalledTimes(2);
  for (const [query] of f.find.mock.calls) expect(query.where).toEqual({ id: "u1" });
});
it("reuses an injected transaction", async () => {
  await resolveOnboardingState("u1", now, db);
  expect(f.transaction).not.toHaveBeenCalled();
});
it.each(["trialing", "grace", "locked", "expired", "canceled"])("never accepts %s as active PREMIUM", async status => {
  const sub = { ...subscription, status, trialEndsAt: subscription.endDate };
  f.find.mockResolvedValue({ ...user, subscription: sub });
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ premiumActive: false, stage: "pay" });
});
it.each(["FREE", "PRO"])("never accepts %s with active status as PREMIUM", async plan => {
  f.find.mockResolvedValue({ ...user, subscription: { ...subscription, plan } });
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ premiumActive: false, stage: "pay" });
});
it("requires a real active subscription rather than a paid order or legacy snapshot", async () => {
  f.find.mockResolvedValue({ ...user, subscription: null, membershipPolicy: {
    grandfatheredAt: now, legacyEntitlementsSnapshot: { plan: "PREMIUM" },
  } });
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ premiumActive: false, isNewSignup: false });
  f.find.mockResolvedValue({ ...user, subscription });
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ premiumActive: true, stage: "complete" });
});
it("preserves release-off reads and the exact new-unclassified boundary", async () => {
  f.find.mockResolvedValue({ ...user, createdAt: effectiveAt });
  expect((await resolveOnboardingState("u1", now, db)).isNewSignup).toBe(true);
  f.find.mockResolvedValue({ ...user, createdAt: new Date(+effectiveAt - 1) });
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ isNewSignup: false, complete: true });
  // 주문/trial이 선생성한 policy(grandfatheredAt=null)는 정산 전이므로 신규로 유지한다
  // (미결제 REALESTATE/BUSINESS가 주문만으로 완료되지 않도록 보장 — Gap-2).
  f.find.mockResolvedValue({ ...user, membershipPolicy: { grandfatheredAt: null, legacyEntitlementsSnapshot: {} } });
  expect((await resolveOnboardingState("u1", now, db)).isNewSignup).toBe(true);
  // 실제 grandfather 스냅샷(grandfatheredAt 설정)만 온보딩 게이트를 면제한다.
  f.find.mockResolvedValue({ ...user, membershipPolicy: { grandfatheredAt: now, legacyEntitlementsSnapshot: {} } });
  expect((await resolveOnboardingState("u1", now, db)).isNewSignup).toBe(false);
  f.release.mockImplementation(() => { throw new Error("unreleased"); });
  f.find.mockResolvedValue(user);
  expect(await resolveOnboardingState("u1", now, db)).toMatchObject({ isNewSignup: false, complete: true });
});
it("rejects missing users", async () => {
  f.find.mockResolvedValue(null);
  await expect(resolveOnboardingState("missing", now, db)).rejects.toMatchObject({ code: "unauthorized" });

});
it("guards only incomplete paid-required new accounts", async () => {
  await expect(requireOnboardingComplete("u1")).rejects.toMatchObject({ code: "forbidden" });
  f.find.mockResolvedValue({ ...user, role: "PERSONAL" });
  expect((await requireOnboardingComplete("u1")).complete).toBe(true);
  f.find.mockResolvedValue({ ...user, subscription });
  expect((await requireOnboardingComplete("u1")).complete).toBe(true);
  f.find.mockResolvedValue({ ...user, createdAt: new Date(0) });
  expect((await requireOnboardingComplete("u1")).complete).toBe(true);
});
it.each(["BUSINESS", "REALESTATE"])("preserves %s legacy PRO baselines", role => {
  for (const membershipPolicy of [null, { grandfatheredAt: now, legacyEntitlementsSnapshot: { plan: "PRO", monitoringLimit: 5 } }]) {
    const result = effectiveEntitlement({ ...user, role, membershipPolicy: membershipPolicy as MemberSubscriptionPolicy | null,
      subscription: { ...subscription, plan: "PRO", policyVersion: null } }, now);
    expect(result.monitoringLimit).toBe(5);
    expect(result.canUsePaidFeatures).toBe(true);
  }
});

it.each(["GUEST", "unexpected", "", "toString", "__proto__"])("consistently rejects unsupported persisted role %j", async role => {
  for (const createdAt of [now, new Date(0)]) {
    f.find.mockResolvedValue({ ...user, role, createdAt, subscription });
    expect(() => decideOnboarding({ ...facts, role, isNewSignup: createdAt === now }))
      .toThrow(expect.objectContaining({ code: "forbidden" }));
    await expect(resolveOnboardingState("u1", now, db)).rejects.toMatchObject({ code: "forbidden" });
  }
});
