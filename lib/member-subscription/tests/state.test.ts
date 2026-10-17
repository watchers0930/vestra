import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
import type { MemberOrderRequest } from "@/types/member-subscription";
type Row = Record<string, unknown>;
const f = vi.hoisted(() => ({ orders: [] as Row[], sub: null as Row | null, payments: [] as Row[],
  policy: { trialUsedAt: null, policyVersion: "fixture", grandfatheredAt: null } as Row,
  role: "PERSONAL", verifyStatus: "none", guest: false, failPayment: false, queue: Promise.resolve() as Promise<unknown> }));
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Row[]).some(v => matches(row, v));
    if (key === "userId_idempotencyKey") return matches(row, value as Row);
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const op = value as Row;
      if ("in" in op) return (op.in as unknown[]).includes(row[key]);
      if ("not" in op) return row[key] !== op.not;
    }
    return row[key] === value;
  });
}
const tx = {
  monitoredProperty: { count: vi.fn(async () => 0), updateMany: vi.fn(async () => ({ count: 0 })) },
  $queryRaw: vi.fn(async () => []),
  user: { findUnique: vi.fn(async () => ({ id: "u1", role: f.role, verifyStatus: f.verifyStatus,
    createdAt: new Date("2026-01-01"), subscription: f.sub, membershipPolicy: f.policy })) },
  memberSubscriptionPolicy: {
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      if (f.policy.trialUsedAt !== where.trialUsedAt) return { count: 0 };
      Object.assign(f.policy, data); return { count: 1 };
    }),
  },
  guestMonitoringOrder: { findFirst: vi.fn(async () => f.guest ? { id: "guest1" } : null) },
  subscriptionOrder: {
    findUnique: vi.fn(async ({ where }: { where: Row }) => f.orders.find(row => matches(row, where)) ?? null),
    findUniqueOrThrow: vi.fn(async ({ where }: { where: Row }) => {
      const result = f.orders.find(row => matches(row, where)); if (!result) throw new Error("missing fixture"); return { ...result };
    }),
    findFirst: vi.fn(async ({ where }: { where: Row }) => f.orders.find(row => matches(row, where)) ?? null),
    create: vi.fn(async ({ data }: { data: Row }) => { const value = { id: "new", status: "pending", ...data }; f.orders.push(value); return value; }),
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      const rows = f.orders.filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
    }),
    update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => { const row = f.orders.find(r => matches(r, where))!; Object.assign(row, data); return { ...row }; }),
  },
  subscription: { upsert: vi.fn(async ({ create, update }: { create: Row; update: Row }) => {
    f.sub = f.sub ? { ...f.sub, ...update } : { id: "sub1", ...create }; return f.sub;
  }) },
  payment: { create: vi.fn(async ({ data }: { data: Row }) => {
    if (f.failPayment) throw new Error("fixture write failure");
    if (f.payments.some(p => p.orderId === data.orderId)) throw new Error("duplicate fixture receipt");
    f.payments.push(data); return data;
  }) },
};
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("../transaction", () => ({ memberTransaction: async (_id: string, operation: (db: typeof tx) => Promise<unknown>) => {
  const run = f.queue.then(async () => {
    const snapshot = structuredClone({ orders: f.orders, sub: f.sub, payments: f.payments, policy: f.policy });
    try { return await operation(tx); }
    catch (error) { Object.assign(f, snapshot); throw error; }
  });
  f.queue = run.catch(() => {}); return run;
} }));
vi.mock("../config", () => ({ memberReleaseConfig: () => ({ policyVersion: "fixture", priceVersion: "fixture", effectiveAt: new Date("2025-01-01") }) }));
vi.mock("../provider", () => ({ memberProviderConfig: () => ({ impCode: "fixture", mid: "fixture", channelEnvironment: "test", merchantConfigVersion: "fixture" }), paymentInfo: () => ({}) }));
import { recordMemberPayment } from "../record-payment";
import { activateMemberOrder } from "../activation";
import { startMemberTrial } from "../trial";
import { createMemberOrder } from "../orders";
const request: MemberOrderRequest = { purpose: "initial", plan: "PRO", durationMonths: 12, productKind: "standard", idempotencyKey: "key1" };
function fixture(status = "pending"): SubscriptionOrder {
  return { id: "o1", orderId: "msub_1", userId: "u1", subscriptionId: null, purpose: "initial", plan: "PRO",
    durationMonths: 12, monthlyPrice: 9900, discountPercent: 20, amount: 95040, currency: "KRW", productKind: "standard",
    priceVersion: "fixture", policyVersion: "fixture", roleAtOrder: "PERSONAL", providerMode: "portone_v1",
    channelEnvironment: "test", merchantConfigVersion: "fixture", status, idempotencyKey: "key1", callbackNonceHash: "hash1",
    nonceConsumedAt: status === "paid" ? new Date() : null, providerTransactionId: status === "paid" ? "imp_1" : null,
    paidAt: status === "paid" ? new Date() : null, verificationEvidence: status === "paid" ? { status: "paid" } : null,
    expiresAt: new Date(Date.now() + 60_000), appliedPeriodStart: null, appliedPeriodEnd: null, appliedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
}
const verified = { status: "paid" as const, impUid: "imp_1", paidAt: new Date(),
  evidence: { status: "paid", amount: 95040, currency: "KRW", checkedAt: new Date().toISOString(), channelEnvironment: "test" } };
beforeEach(() => {
  vi.clearAllMocks(); f.orders = []; f.sub = null; f.payments = []; f.policy = { trialUsedAt: null, policyVersion: "fixture", grandfatheredAt: null };
  f.role = "PERSONAL"; f.verifyStatus = "none"; f.guest = false; f.failPayment = false; f.queue = Promise.resolve();
  vi.stubEnv("AUTH_SECRET", "fixture-secret");
});
it("records concurrent callbacks once, then applies exactly one receipt and period", async () => {
  const order = fixture(); f.orders.push({ ...order });
  await Promise.all([recordMemberPayment(order, verified), recordMemberPayment(order, verified)]);
  expect(f.orders[0].status).toBe("paid");
  expect(tx.subscriptionOrder.updateMany).toHaveBeenCalledTimes(1);
  await Promise.all([activateMemberOrder("u1", "msub_1"), activateMemberOrder("u1", "msub_1")]);
  expect(f.payments).toHaveLength(1);
  expect(f.orders[0].appliedAt).toBeInstanceOf(Date);
  const end = f.sub!.endDate;
  await activateMemberOrder("u1", "msub_1"); expect(f.sub!.endDate).toEqual(end);
});
it("preserves paid state if application fails and recovers without duplicating receipt", async () => {
  const order = fixture(); f.orders.push({ ...order });
  await recordMemberPayment(order, verified);
  f.failPayment = true;
  await expect(activateMemberOrder("u1", "msub_1")).rejects.toThrow("fixture write failure");
  expect(f.orders[0].status).toBe("paid"); expect(f.orders[0].appliedAt).toBeNull(); expect(f.sub).toBeNull();
  f.failPayment = false;
  await activateMemberOrder("u1", "msub_1"); expect(f.payments).toHaveLength(1);
});
it("blocks guest and other member transaction reuse without consuming nonce", async () => {
  const order = fixture(); f.orders.push({ ...order }); f.guest = true;
  await expect(recordMemberPayment(order, verified)).rejects.toMatchObject({ code: "transaction_conflict" });
  expect(f.orders[0].nonceConsumedAt).toBeNull();
  f.guest = false; f.orders.push({ ...fixture("paid"), id: "other", orderId: "msub_other" });
  await expect(recordMemberPayment(order, verified)).rejects.toMatchObject({ code: "transaction_conflict" });
});
it("never releases needs_review on callback retry", async () => {
  const order = fixture("needs_review"); f.orders.push({ ...order });
  await expect(recordMemberPayment(order, verified)).rejects.toMatchObject({ code: "payment_needs_review" });
  await expect(activateMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code: "payment_needs_review" });
  expect(f.payments).toHaveLength(0);
});
it("refuses unpaid activation and does not promote roles", async () => {
  f.orders.push({ ...fixture() });
  await expect(activateMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code: "payment_failed" });
  f.orders = [{ ...fixture("paid") }]; await activateMemberOrder("u1", "msub_1");
  expect(f.role).toBe("PERSONAL"); expect(f.sub!.price).toBe(9900);
});
it("preserves subscription startDate and extends remaining period", async () => {
  const startDate = new Date("2020-01-01"); const endDate = new Date("2030-01-31T00:00:00Z");
  f.sub = { id: "sub1", plan: "PRO", status: "active", startDate, endDate };
  f.orders.push({ ...fixture("paid") }); await activateMemberOrder("u1", "msub_1");
  expect(f.sub!.startDate).toEqual(startDate); expect(f.sub!.endDate).toEqual(new Date("2031-01-31T00:00:00Z"));
});
it("allows only one trial under concurrent requests and creates no payment", async () => {
  const results = await Promise.allSettled([startMemberTrial("u1", "PRO"), startMemberTrial("u1", "PRO")]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(f.sub!.status).toBe("trialing"); expect(f.policy.trialUsedAt).toBeInstanceOf(Date);
  expect(+(f.sub!.trialEndsAt as Date) - +(f.sub!.trialStartedAt as Date)).toBe(168 * 3_600_000);
  expect(f.payments).toHaveLength(0); expect(f.orders).toHaveLength(0);
});
it("checks role and business verification at the server boundary", async () => {
  await expect(startMemberTrial("u1", "PREMIUM")).rejects.toMatchObject({ code: "plan_not_allowed" });
  f.role = "RENTAL_BIZ";
  await expect(startMemberTrial("u1", "PREMIUM")).rejects.toMatchObject({ code: "verification_required" });
  f.verifyStatus = "verified";
  await expect(createMemberOrder("u1", { ...request, durationMonths: 1, productKind: "paid_trial" })).rejects.toMatchObject({ code: "plan_not_allowed" });
  expect((await startMemberTrial("u1", "PREMIUM")).monitoringLimit).toBe(20);
});
it("reuses matching keys and rejects changed products", async () => {
  f.orders.push({ ...fixture("paid"), appliedAt: new Date() });
  expect((await createMemberOrder("u1", request)).orderId).toBe("msub_1");
  await expect(createMemberOrder("u1", { ...request, durationMonths: 6 })).rejects.toMatchObject({ code: "idempotency_conflict" });
});
it("prevents simultaneous initial orders and active plan changes", async () => {
  const a = createMemberOrder("u1", request); const b = createMemberOrder("u1", { ...request, idempotencyKey: "key2" });
  const result = await Promise.all([a, b]); expect(result[0].orderId).toBe(result[1].orderId); expect(f.orders).toHaveLength(1);
  f.orders = []; f.role = "BUSINESS"; f.verifyStatus = "verified";
  f.sub = { plan: "PRO", status: "active", endDate: new Date("2030-01-01") };
  await expect(createMemberOrder("u1", { ...request, plan: "PREMIUM" })).rejects.toMatchObject({ code: "plan_change_not_allowed" });
});
it("loads the locked user only once when creating an order or trial", async () => {
  await createMemberOrder("u1", request);
  expect(tx.user.findUnique).toHaveBeenCalledTimes(1);
  f.orders = [];
  vi.clearAllMocks();
  await startMemberTrial("u1", "PRO");
  expect(tx.user.findUnique).toHaveBeenCalledTimes(1);
});
