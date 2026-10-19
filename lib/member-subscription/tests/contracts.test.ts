import { afterEach, describe, expect, it, vi } from "vitest";
import { computeAmount, priceProduct, ROLE_ALLOWED_PLANS } from "../pricing";
import { callbackSchema, orderSchema, recoverSchema, trialSchema } from "../schemas";
import { addCalendarMonths, paidPeriod, subscriptionState, DAY_MS } from "../lifecycle";
import { issueCallbackContext, verifyCallbackContext } from "../callback-context";
import { memberProviderConfig, paymentInfo } from "../provider";
import type { Subscription, SubscriptionOrder } from "@prisma/client";
import type { DurationMonths } from "@/types/member-subscription";
vi.mock("@/lib/danal/portone-v1-config", () => ({ getPortoneV1Config: vi.fn(() => { throw new Error("private supplier details"); }) }));
vi.mock("../config", () => ({ memberReleaseConfig: () => ({ priceVersion: "fixture", policyVersion: "fixture", effectiveAt: new Date(0) }) }));
afterEach(() => vi.unstubAllEnvs());
const request = { purpose: "initial", plan: "PRO", durationMonths: 12, productKind: "standard", idempotencyKey: "c98f1f62-18d8-49aa-8764-9cf7d5392c12" };
export const order = { id: "o1", orderId: "msub_fixture", userId: "user-a", expiresAt: new Date("2026-10-16T01:15:00Z"),
  createdAt: new Date("2026-10-16T01:00:00Z"), plan: "PRO", amount: 95040, durationMonths: 12,
  currency: "KRW", status: "pending", providerTransactionId: null, nonceConsumedAt: null,
} as SubscriptionOrder;
describe("price contract", () => {
  it.each([[1, 9900], [3, 29700], [6, 53460], [9, 75735], [12, 95040], [24, 166320]])("PRO %i months", (months, amount) => {
    expect(priceProduct("PRO", months as DurationMonths, months === 1 ? "paid_trial" : "standard").amount).toBe(amount);
  });
  it.each([[3, 89700], [6, 161460], [9, 228735], [12, 287040], [24, 502320]])("PREMIUM %i months", (months, amount) => {
    expect(priceProduct("PREMIUM", months as DurationMonths, "standard").amount).toBe(amount);
  });
  it.each([[0, 3, 0], [-1, 3, 0], [1.5, 3, 0], [1, 3, 10], [9900, 1, 100], [Number.MAX_SAFE_INTEGER, 24, 30]])("rejects invalid arithmetic %j", (a, b, c) => {
    expect(() => computeAmount(a, b, c)).toThrow();
  });
  it("restricts role plans and one month products", () => {
    expect(ROLE_ALLOWED_PLANS.PERSONAL).toEqual(["PRO"]);
    expect(ROLE_ALLOWED_PLANS.RENTAL_BIZ).toEqual(["PRO", "PREMIUM"]);
    for (const role of ["BUSINESS", "REALESTATE"] as const) expect(ROLE_ALLOWED_PLANS[role]).toEqual(["PREMIUM"]);
    expect(() => priceProduct("PREMIUM", 1, "standard")).toThrow();
    expect(() => priceProduct("PRO", 1, "standard")).toThrow();
    expect(() => priceProduct("PRO", 3, "paid_trial")).toThrow();
  });
});
describe("strict DTOs", () => {
  it("accepts the fixed order contract", () => expect(orderSchema.safeParse(request).success).toBe(true));
  it.each(["amount", "discountPercent", "monitoringLimit", "userId", "role", "startDate", "success"])("rejects extra %s", key => {
    expect(orderSchema.safeParse({ ...request, [key]: 1 }).success).toBe(false);
  });
  it("rejects malformed durations, UUID and the removed roleApplicationId field", () => {
    for (const patch of [{ durationMonths: 1.5 }, { durationMonths: 2 }, { idempotencyKey: "x" }, { roleApplicationId: "app1" }, { productKind: "paid_trial" }]) {
      expect(orderSchema.safeParse({ ...request, ...patch }).success).toBe(false);
    }
  });
  it("validates callbacks, recovery and trial strictly", () => {
    expect(callbackSchema.safeParse({ paymentId: "msub_1", imp_uid: "imp_123", callbackContext: "a", callbackSignature: "a".repeat(64) }).success).toBe(true);
    expect(recoverSchema.safeParse({}).success).toBe(true);
    expect(recoverSchema.safeParse({ imp_uid: "../secret" }).success).toBe(false);
    expect(trialSchema.safeParse({ plan: "PREMIUM", amount: 0 }).success).toBe(false);
  });
});
describe("calendar and expiration", () => {
  it.each([["2024-01-31T03:04:05Z", 1, "2024-02-29T03:04:05.000Z"],
    ["2023-01-31T03:04:05Z", 1, "2023-02-28T03:04:05.000Z"],
    ["2024-02-29T03:04:05Z", 12, "2025-02-28T03:04:05.000Z"],
    ["2026-01-30T16:00:00Z", 1, "2026-02-27T16:00:00.000Z"]])("clamps Seoul month end", (start, months, end) => {
    expect(addCalendarMonths(new Date(start), months as number).toISOString()).toBe(end);
  });
  it.each([1, 3, 6, 9, 12, 24])("adds %i months", months => {
    expect(addCalendarMonths(new Date("2026-01-15T00:00:00Z"), months).getUTCMonth()).toBe(months % 12);
  });
  it("retains paid remainder, discards trial remainder", () => {
    const now = new Date("2026-01-01T00:00:00Z"); const end = new Date("2026-02-01T00:00:00Z");
    expect(paidPeriod({ status: "active", endDate: end } as Subscription, 3, now).start).toEqual(end);
    expect(paidPeriod({ status: "trialing", endDate: end } as Subscription, 3, now).start).toEqual(now);
    expect(paidPeriod({ status: "expired", endDate: new Date(0) } as Subscription, 3, now).start).toEqual(now);
  });
  it("calculates grace/lock without cron and preserves legacy", () => {
    const endDate = new Date("2026-01-01T00:00:00Z");
    const sub = { status: "active", endDate, policyVersion: "fixture" } as Subscription;
    expect(subscriptionState(sub, true, false, endDate).status).toBe("grace");
    expect(subscriptionState(sub, true, false, new Date(+endDate + 7 * DAY_MS - 1)).status).toBe("grace");
    expect(subscriptionState(sub, true, false, new Date(+endDate + 7 * DAY_MS)).status).toBe("locked");
    expect(subscriptionState(sub, false, false, endDate).status).toBe("expired");
    expect(subscriptionState({ ...sub, policyVersion: null }, true, true, new Date(+endDate + 8 * DAY_MS)).status).toBe("active");
    expect(subscriptionState(sub, true, true, new Date(+endDate + 8 * DAY_MS)).status).toBe("expired");
  });
});
describe("callback domain and nonce", () => {
  it("binds order, user and expiry, rejects tampering, permits same consumed transaction replay", () => {
    vi.stubEnv("AUTH_SECRET", "fixture-secret");
    const context = issueCallbackContext(order);
    const bound = { ...order, callbackNonceHash: context.callbackNonceHash };
    const verify = (o: SubscriptionOrder, sig = context.callbackSignature, now = order.createdAt) => verifyCallbackContext(o, context.callbackContext, sig, "imp_1", now);
    expect(() => verify(bound)).not.toThrow();
    expect(() => verify({ ...bound, userId: "other" })).toThrow();
    expect(() => verify(bound, "0".repeat(64))).toThrow();
    expect(() => verify(bound, undefined, order.expiresAt)).toThrow();
    expect(() => verify({ ...bound, nonceConsumedAt: order.createdAt, providerTransactionId: "imp_1" }, undefined, new Date("2030-01-01"))).not.toThrow();
    expect(() => verify({ ...bound, nonceConsumedAt: order.createdAt, providerTransactionId: "imp_2" })).toThrow();
    expect(issueCallbackContext(order)).toEqual(context);
  });
  it("never exposes nonce hash in payment DTO", () => {
    vi.stubEnv("AUTH_SECRET", "fixture-secret");
    const dto = paymentInfo(order, { impCode: "imp", mid: "mid", channelEnvironment: "test", merchantConfigVersion: "fixture" }, issueCallbackContext(order));
    expect(Object.keys(dto)).not.toContain("callbackNonceHash");
    expect(dto.paymentId).toBe(order.orderId);
  });
  it("blocks production and unresolved channels", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => memberProviderConfig()).toThrow("현재 구독 결제를 이용할 수 없습니다.");
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("MEMBER_PAYMENT_ENVIRONMENT", "test"); vi.stubEnv("MEMBER_SUBSCRIPTION_ISOLATED_TEST", "true");
    vi.stubEnv("MEMBER_MERCHANT_CONFIG_VERSION", "fixture");
    expect(() => memberProviderConfig()).toThrow("현재 구독 결제를 이용할 수 없습니다.");
  });
});
