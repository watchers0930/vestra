import { expect, it, vi } from "vitest";
import type { MemberSubscriptionPolicy, Subscription } from "@prisma/client";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { effectiveEntitlement } from "../policy";
const now = new Date("2026-10-16T00:00:00Z");
const sub = { plan: "PRO", status: "active", policyVersion: "fixture", endDate: new Date("2026-10-20T00:00:00Z") } as Subscription;
const policy = { policyVersion: "fixture", grandfatheredAt: null, legacyEntitlementsSnapshot: {} } as MemberSubscriptionPolicy;
const user = { id: "u1", role: "PERSONAL", verifyStatus: "none", subscription: sub, membershipPolicy: policy };
it("computes current entitlements independently of JWT or cron state", () => {
  expect(effectiveEntitlement(user, now)).toMatchObject({ plan: "PRO", monitoringLimit: 5, canUsePaidFeatures: true });
  expect(effectiveEntitlement({ ...user, subscription: { ...sub, endDate: new Date(0) } }, now)).toMatchObject({ plan: "FREE", monitoringLimit: 0, canUsePaidFeatures: false });
});
it("revokes new business paid features when verification is revoked", () => {
  expect(effectiveEntitlement({ ...user, role: "RENTAL_BIZ", verifyStatus: "verified" }, now).canUsePaidFeatures).toBe(true);
  expect(effectiveEntitlement({ ...user, role: "RENTAL_BIZ" }, now)).toMatchObject({ monitoringLimit: 0, canUsePaidFeatures: false });
  expect(effectiveEntitlement({ ...user, subscription: { ...sub, plan: "PREMIUM" } }, now).canUsePaidFeatures).toBe(false);
});
it("separates grandfather baseline from newly purchased term", () => {
  const expired = { ...sub, plan: "PREMIUM", endDate: new Date(0) };
  const base = { ...policy, grandfatheredAt: new Date(0), legacyEntitlementsSnapshot: { plan: "PRO", monitoringLimit: 5 } };
  expect(effectiveEntitlement({ ...user, subscription: expired, membershipPolicy: base }, now)).toMatchObject({ plan: "PRO", monitoringLimit: 5, canUsePaidFeatures: true });
  expect(effectiveEntitlement({ ...user, subscription: expired, membershipPolicy: { ...base, legacyEntitlementsSnapshot: { plan: "FREE", monitoringLimit: 0 } } }, now)).toMatchObject({ plan: "FREE", monitoringLimit: 0, canUsePaidFeatures: false });
});
it("retains legacy BUSINESS 20 and unlimited legacy endDate semantics", () => {
  expect(effectiveEntitlement({ ...user, subscription: { ...sub, plan: "BUSINESS", policyVersion: null, endDate: null }, membershipPolicy: null }, now)).toMatchObject({ plan: "PREMIUM", monitoringLimit: 20, canUsePaidFeatures: true, grandfathered: true });
});
it("preserves ADMIN entitlement and business 7-day grace boundary", () => {
  expect(effectiveEntitlement({ ...user, role: "ADMIN", subscription: null }, now)).toMatchObject({ monitoringLimit: 100, canUsePaidFeatures: true });
  const end = new Date(+now - 7 * 86_400_000);
  expect(effectiveEntitlement({ ...user, role: "BUSINESS", verifyStatus: "verified", subscription: { ...sub, endDate: end } }, now)).toMatchObject({ monitoringLimit: 0, canUsePaidFeatures: false, state: { status: "locked" } });
});

it("does not let grandfathering bypass verification for newly purchased rights", () => {
  const baseline = { ...policy, grandfatheredAt: new Date(0), legacyEntitlementsSnapshot: { plan: "FREE", monitoringLimit: 0 } };
  expect(effectiveEntitlement({ ...user, role: "BUSINESS", membershipPolicy: baseline }, now).monitoringLimit).toBe(0);
  const trial = { ...sub, status: "trialing", trialEndsAt: sub.endDate };
  expect(effectiveEntitlement({ ...user, membershipPolicy: baseline, subscription: trial }, now).monitoringLimit).toBe(5);
});
it.each([{}, null, [], { monitoringLimit: -1 }, { monitoringLimit: 1.5 }, { monitoringLimit: "5" }])(
  "preserves loaded legacy rights with incomplete snapshot %j", snapshot => {
    const baseline = { ...policy, grandfatheredAt: now, legacyEntitlementsSnapshot: snapshot } as MemberSubscriptionPolicy;
    for (const [plan, limit] of [["PRO", 5], ["BUSINESS", 20]] as const) {
      expect(effectiveEntitlement({ ...user, subscription: { ...sub, plan, policyVersion: null, endDate: new Date(0) },
        membershipPolicy: baseline }, now).monitoringLimit).toBe(limit);
    }
  });
it("restores a plan-only baseline even when the old subscription row is missing", () => {
  expect(effectiveEntitlement({ ...user, subscription: null, membershipPolicy: {
    ...policy, grandfatheredAt: now, legacyEntitlementsSnapshot: { plan: "BUSINESS" },
  } }, now)).toMatchObject({ plan: "PREMIUM", monitoringLimit: 20, canUsePaidFeatures: true });
});
it("does not invent rights from an empty snapshot or an expired new term", () => {
  const baseline = { ...policy, grandfatheredAt: now };
  expect(effectiveEntitlement({ ...user, subscription: null, membershipPolicy: baseline }, now).monitoringLimit).toBe(0);
  expect(effectiveEntitlement({ ...user, subscription: { ...sub, endDate: new Date(0) }, membershipPolicy: baseline }, now).monitoringLimit).toBe(0);
});
