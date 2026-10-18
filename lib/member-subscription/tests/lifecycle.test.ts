import { beforeEach, expect, it, vi, describe } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";

// Unit coverage for runMemberLifecycle — the cron orchestration that lacks a DB harness.
// Focus: codex-found defect fixes — HIGH1 (pause expired/over-limit classified members'
// monitoring so the shared registry-monitor batch excludes them) and HIGH3 (re-verify a
// paid-but-unapplied order with the PG before granting a term; refunds must not grant access).
const f = vi.hoisted(() => ({
  orderFind: vi.fn(), orderUpdate: vi.fn(), subFind: vi.fn(),
  settle: vi.fn(), mark: vi.fn(),
  state: vi.fn(), entitlement: vi.fn(),
  // tx operations
  txSubFind: vi.fn(), txUserFind: vi.fn(), txSubUpdate: vi.fn(),
  propCount: vi.fn(), propUpdateMany: vi.fn(), noticeCreate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  subscriptionOrder: { findMany: f.orderFind, update: f.orderUpdate },
  subscription: { findMany: f.subFind },
} }));
vi.mock("../transaction", () => ({ memberTransaction: (_id: string, op: (tx: unknown) => unknown) => op({
  subscription: { findUnique: f.txSubFind, update: f.txSubUpdate },
  user: { findUnique: f.txUserFind },
  monitoredProperty: { count: f.propCount, updateMany: f.propUpdateMany },
  notification: { createMany: f.noticeCreate },
}) }));
vi.mock("../payment-callback", () => ({ settleMemberOrder: f.settle }));
vi.mock("../record-payment", () => ({ markNeedsReview: f.mark }));
vi.mock("../config", () => ({ memberReleaseConfig: () => ({ policyVersion: "fixture", priceVersion: "fixture", effectiveAt: new Date("2026-01-01") }) }));
vi.mock("../lifecycle", async importOriginal => ({ ...await importOriginal<typeof import("../lifecycle")>(), subscriptionState: f.state }));
vi.mock("../policy", async importOriginal => ({ ...await importOriginal<typeof import("../policy")>(),
  effectiveEntitlement: f.entitlement, BUSINESS_ROLES: ["BUSINESS", "REALESTATE"] }));
import { runMemberLifecycle } from "../cron";

const now = new Date();
const paidOrder = (over: Partial<SubscriptionOrder> = {}) => ({ id: "o1", orderId: "msub_1", userId: "u1",
  status: "paid", appliedAt: null, providerTransactionId: "imp_1", ...over } as SubscriptionOrder);

beforeEach(() => {
  vi.clearAllMocks();
  f.orderFind.mockResolvedValue([]);      // no recovery orders by default
  f.subFind.mockResolvedValue([]);        // no expiring subscriptions by default
  f.orderUpdate.mockResolvedValue({});
  f.settle.mockResolvedValue({});
  f.mark.mockResolvedValue(undefined);
  f.txSubUpdate.mockResolvedValue({});
  f.propUpdateMany.mockResolvedValue({ count: 0 });
  f.noticeCreate.mockResolvedValue({ count: 1 });
});

describe("recovery: paid-but-unapplied orders (HIGH3)", () => {
  it("re-verifies with the PG (reverify=true) before granting a term", async () => {
    f.orderFind.mockResolvedValue([paidOrder()]);
    const result = await runMemberLifecycle();
    expect(f.settle).toHaveBeenCalledWith(expect.objectContaining({ orderId: "msub_1" }), "imp_1", true);
    expect(result.recovered).toBe(1);
    expect(f.mark).not.toHaveBeenCalled();
  });
  it("never settles an order without a provider transaction — marks needs_review", async () => {
    f.orderFind.mockResolvedValue([paidOrder({ providerTransactionId: null })]);
    await runMemberLifecycle();
    expect(f.settle).not.toHaveBeenCalled();
    expect(f.mark).toHaveBeenCalledWith(expect.objectContaining({ orderId: "msub_1" }));
  });
  it("routes definite settlement failures to needs_review and retains the paid record", async () => {
    const { MemberError } = await import("../errors");
    f.orderFind.mockResolvedValue([paidOrder()]);
    f.settle.mockRejectedValue(new MemberError("payment_needs_review"));
    const result = await runMemberLifecycle();
    expect(f.mark).toHaveBeenCalledWith(expect.objectContaining({ orderId: "msub_1" }));
    expect(f.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "o1" } }));
    expect(result.recovered).toBe(0);
  });
});

describe("expiry: state-based pause of monitoring (HIGH1)", () => {
  function dueMember(opts: { role?: string; grandfathered: boolean; canUse: boolean; limit: number;
    activeCount: number; status?: string }) {
    f.subFind.mockResolvedValue([{ userId: "u1" }]);
    f.txSubFind.mockResolvedValue({ id: "s1", userId: "u1", status: opts.status ?? "active",
      endDate: new Date(now.getTime() - 1000), trialEndsAt: null });
    f.txUserFind.mockResolvedValue({ id: "u1", role: opts.role ?? "PERSONAL", verifyStatus: "none",
      membershipPolicy: { grandfatheredAt: opts.grandfathered ? new Date() : null } });
    f.state.mockReturnValue({ status: opts.canUse ? "active" : "expired", graceEndsAt: null, lockedAt: null });
    f.entitlement.mockReturnValue({ grandfathered: opts.grandfathered, canUsePaidFeatures: opts.canUse,
      monitoringLimit: opts.limit });
    f.propCount.mockResolvedValue(opts.activeCount);
  }

  it("pauses ALL active monitoring for an expired classified (non-grandfather) member", async () => {
    dueMember({ grandfathered: false, canUse: false, limit: 0, activeCount: 3 });
    await runMemberLifecycle();
    expect(f.propUpdateMany).toHaveBeenCalledWith({ where: { userId: "u1", status: "active" }, data: { status: "paused" } });
    expect(f.txSubUpdate).toHaveBeenCalled();
  });

  it("never pauses a grandfathered member (preserved rights)", async () => {
    dueMember({ grandfathered: true, canUse: false, limit: 0, activeCount: 3 });
    await runMemberLifecycle();
    expect(f.propUpdateMany).not.toHaveBeenCalled();
  });

  it("pauses over-limit monitoring for a still-paid member above their plan limit", async () => {
    dueMember({ grandfathered: false, canUse: true, limit: 5, activeCount: 9 });
    await runMemberLifecycle();
    expect(f.propUpdateMany).toHaveBeenCalledWith({ where: { userId: "u1", status: "active" }, data: { status: "paused" } });
  });

  it("does not pause a within-limit active member", async () => {
    dueMember({ grandfathered: false, canUse: true, limit: 5, activeCount: 2 });
    await runMemberLifecycle();
    expect(f.propUpdateMany).not.toHaveBeenCalled();
  });

  it("does not pause when the member has no active monitoring", async () => {
    dueMember({ grandfathered: false, canUse: false, limit: 0, activeCount: 0 });
    await runMemberLifecycle();
    expect(f.propUpdateMany).not.toHaveBeenCalled();
  });

  it("skips members without a membership policy (never guesses rights)", async () => {
    f.subFind.mockResolvedValue([{ userId: "u1" }]);
    f.txSubFind.mockResolvedValue({ id: "s1", userId: "u1", status: "active", endDate: new Date(), trialEndsAt: null });
    f.txUserFind.mockResolvedValue({ id: "u1", role: "PERSONAL", verifyStatus: "none", membershipPolicy: null });
    await runMemberLifecycle();
    expect(f.txSubUpdate).not.toHaveBeenCalled();
    expect(f.propUpdateMany).not.toHaveBeenCalled();
  });

  it("persists the computed subscription state and notifies once (deduped)", async () => {
    dueMember({ grandfathered: false, canUse: false, limit: 0, activeCount: 1 });
    f.state.mockReturnValue({ status: "grace", graceEndsAt: new Date(now.getTime() + 1000), lockedAt: null });
    f.entitlement.mockReturnValue({ grandfathered: false, canUsePaidFeatures: false, monitoringLimit: 0 });
    await runMemberLifecycle();
    expect(f.txSubUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "s1" }, data: expect.objectContaining({ status: "grace" }) }));
    expect(f.noticeCreate).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
