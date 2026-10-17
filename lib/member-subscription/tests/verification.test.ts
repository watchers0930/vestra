import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
import type { IamportPayment } from "@/lib/danal/iamport-rest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), config: { impCode: "code", mid: "fixture-mid", channelEnvironment: "test", merchantConfigVersion: "fixture" } }));
vi.mock("@/lib/danal/iamport-rest", () => ({ getPaymentByImpUid: mocks.get }));
vi.mock("../provider", () => ({ memberProviderConfig: () => mocks.config }));
import { validatePayment, verifyMemberPayment } from "../verification";
const order = { id: "o1", orderId: "msub_1", amount: 95040, monthlyPrice: 9900, durationMonths: 12, discountPercent: 20,
  currency: "KRW", channelEnvironment: "test", merchantConfigVersion: "fixture",
  createdAt: new Date("2026-10-01T00:00:00Z"), expiresAt: new Date("2026-10-01T00:15:00Z") } as SubscriptionOrder;
const payment: IamportPayment = { imp_uid: "imp_1", merchant_uid: "msub_1", amount: 95040, currency: "KRW",
  pg_provider: "danal_tpay", pg_id: "fixture-mid", pay_method: "card", status: "paid", paid_at: Date.parse("2026-10-01T00:01:00Z") / 1000,
  cancel_amount: 0, sandbox: true };
const validate = (p: IamportPayment, o = order) => validatePayment(o, "imp_1", p, mocks.config as Parameters<typeof validatePayment>[3], new Date("2026-10-01T00:05:00Z"));
beforeEach(() => vi.clearAllMocks());
it("accepts only the exact verified snapshot", () => {
  expect(validate(payment).status).toBe("paid");
  expect(validate(payment).evidence).not.toHaveProperty("imp_uid");
});
it.each([
  { imp_uid: "imp_other" }, { merchant_uid: "guest_1" }, { amount: 1 }, { amount: 95040.1 },
  { currency: "USD" }, { pg_provider: "danal" }, { pg_id: "other" }, { pay_method: "vbank" },
  { paid_at: 0 }, { paid_at: Date.parse("2026-10-01T00:16:00Z") / 1000 },
  { paid_at: Date.parse("2026-09-30T23:59:59Z") / 1000 }, { cancel_amount: 1 },
  { cancelled_at: 1 }, { cancel_history: [{ amount: 1, cancelled_at: 1 }] }, { status: "other" },
])("rejects payment field mismatch %j", patch => {
  expect(() => validate({ ...payment, ...patch })).toThrow();
});
it("rejects missing/mixed environment, configuration changes and bad order snapshot", () => {
  expect(() => validate({ ...payment, sandbox: undefined })).toThrow();
  expect(() => validate({ ...payment, sandbox: false })).toThrow();
  expect(() => validate(payment, { ...order, merchantConfigVersion: "changed" })).toThrow();
  expect(() => validate(payment, { ...order, monthlyPrice: 10000 })).toThrow();
});
it("distinguishes pending and terminal without manufacturing paidAt", () => {
  expect(() => validate({ ...payment, status: "ready", paid_at: 0 })).toThrow("결제 확인 중");
  for (const status of ["failed", "cancelled"]) {
    const value = validate({ ...payment, status, paid_at: 0 });
    expect(value.paidAt).toBeNull();
    expect(() => validate({ ...payment, status })).toThrow();
  }
});
it("requires two independent matching REST reads", async () => {
  mocks.get.mockResolvedValue(payment);
  expect((await verifyMemberPayment(order, "imp_1")).status).toBe("paid");
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it("does not activate when status changes between reads", async () => {
  mocks.get.mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, status: "cancelled", cancel_amount: 95040 });
  await expect(verifyMemberPayment(order, "imp_1")).rejects.toMatchObject({ code: "payment_needs_review" });
});
it("normalizes provider errors without leaking internal text", async () => {
  mocks.get.mockRejectedValue(new Error("secret supplier response"));
  await expect(verifyMemberPayment(order, "imp_1")).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
});
it("requires a second read even for a terminal failure", async () => {
  mocks.get.mockResolvedValue({ ...payment, status: "failed", paid_at: 0 });
  expect((await verifyMemberPayment(order, "imp_1")).paidAt).toBeNull();
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
