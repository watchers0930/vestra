import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ user: vi.fn(), count: vi.fn(), orders: vi.fn(), history: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: f.user }, monitoredProperty: { count: f.count },
  subscriptionOrder: { findMany: f.orders, findFirst: f.history },
} }));
vi.mock("../config", () => ({ memberReleaseConfig: () => ({ effectiveAt: new Date("2026-01-01"), policyVersion: "fixture", priceVersion: "fixture" }) }));
import { memberSubscriptionStatus } from "../status";
const user = { id: "u1", role: "PERSONAL", verifyStatus: "none", createdAt: new Date("2026-02-01"), subscription: null, membershipPolicy: null };
beforeEach(() => { vi.clearAllMocks(); f.user.mockResolvedValue(user); f.count.mockResolvedValue(0); f.orders.mockResolvedValue([]); f.history.mockResolvedValue(null); });
it("shows eligible new FREE users before their first policy write", async () => {
  expect(await memberSubscriptionStatus("u1")).toMatchObject({ plan: "FREE", status: "active", isGrandfathered: false,
    trialEligible: true, monitoring: { used: 0, limit: 0 }, renewalCandidate: null, receipts: [] });
});
it("does not classify an old unbackfilled member as new or eligible", async () => {
  f.user.mockResolvedValue({ ...user, createdAt: new Date("2025-01-01") });
  expect(await memberSubscriptionStatus("u1")).toMatchObject({ isGrandfathered: true, trialEligible: false });
});
it("does not offer one-time paid trial as a renewal candidate", async () => {
  f.orders.mockResolvedValue([{ orderId: "msub_1", plan: "PRO", durationMonths: 1, amount: 9900, paidAt: new Date("2026-02-01"), payment: null }]);
  f.history.mockResolvedValue({ id: "o1" });
  expect(await memberSubscriptionStatus("u1")).toMatchObject({ paidTrialEligible: false, renewalCandidate: null,
    receipts: [{ orderId: "msub_1", plan: "PRO", amount: 9900, paidAt: "2026-02-01T00:00:00.000Z", receiptUrl: null }] });
});
it("limits receipt reads and scopes each query to the authenticated owner", async () => {
  await memberSubscriptionStatus("u1");
  expect(f.orders).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }), take: 10 }));
  expect(f.count).toHaveBeenCalledWith({ where: { userId: "u1", status: "active" } });
});
