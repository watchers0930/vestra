import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
import type { V2Payment } from "@/lib/danal/portone-v2-schemas";
const mocks = vi.hoisted(() => ({ get: vi.fn(), config: { storeId: "store-x", channelKey: "channel-key-x", channelEnvironment: "test", merchantConfigVersion: "fixture" } }));
vi.mock("@/lib/danal/portone-v2-rest", () => ({ getPaymentByIdV2: mocks.get }));
vi.mock("../provider", () => ({ memberProviderConfig: () => mocks.config }));
import { validatePayment, verifyMemberPayment } from "../verification";
const order = { id: "o1", orderId: "msub_1", amount: 95040, monthlyPrice: 9900, durationMonths: 12, discountPercent: 20,
  currency: "KRW", channelEnvironment: "test", merchantConfigVersion: "fixture",
  createdAt: new Date("2026-10-01T00:00:00Z"), expiresAt: new Date("2026-10-01T00:15:00Z") } as SubscriptionOrder;
const payment: V2Payment = { id: "msub_1", status: "PAID", amount: { total: 95040, paid: 95040, cancelled: 0 },
  currency: "KRW", channel: { pgProvider: "DANAL", key: "channel-key-x" }, paidAt: "2026-10-01T00:01:00Z" };
const validate = (p: V2Payment, o = order) => validatePayment(o, "msub_1", p, mocks.config as Parameters<typeof validatePayment>[3], new Date("2026-10-01T00:05:00Z"));
beforeEach(() => vi.clearAllMocks());
it("accepts only the exact verified snapshot", () => {
  expect(validate(payment).status).toBe("paid");
  expect(validate(payment).evidence).not.toHaveProperty("impUid");
});
it("rejects payment id / provided id mismatch", () => {
  expect(() => validate({ ...payment, id: "msub_other" })).toThrow();
  expect(() => validatePayment(order, "msub_other", payment, mocks.config as Parameters<typeof validatePayment>[3], new Date("2026-10-01T00:05:00Z"))).toThrow();
});
it.each([
  { amount: { total: 1 } }, { amount: { total: 95040.1 } }, { currency: "USD" },
  { paidAt: "2026-10-01T00:16:00Z" }, { paidAt: "2026-09-30T23:59:59Z" },
  { amount: { total: 95040, cancelled: 1 } }, { status: "OTHER" },
])("rejects payment field mismatch %j", patch => {
  expect(() => validate({ ...payment, ...patch } as V2Payment)).toThrow();
});
it("rejects missing/mixed environment, configuration changes and bad order snapshot", () => {
  expect(() => validate(payment, { ...order, merchantConfigVersion: "changed" })).toThrow();
  expect(() => validate(payment, { ...order, monthlyPrice: 10000 })).toThrow();
});
it("distinguishes pending and terminal without manufacturing paidAt", () => {
  expect(() => validate({ ...payment, status: "READY", paidAt: undefined })).toThrow("결제 확인 중");
  for (const status of ["FAILED", "CANCELLED"]) {
    const value = validate({ ...payment, status, paidAt: undefined, amount: { total: 95040, cancelled: 0 } });
    expect(value.paidAt).toBeNull();
  }
  // FAILED는 결제 완료 흔적(paidAt)이 있으면 거부(상태-증거 불일치).
  expect(() => validate({ ...payment, status: "FAILED" })).toThrow();
});
it("requires two independent matching REST reads", async () => {
  mocks.get.mockResolvedValue(payment);
  expect((await verifyMemberPayment(order, "msub_1")).status).toBe("paid");
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it("does not activate when status changes between reads", async () => {
  mocks.get.mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, status: "CANCELLED", amount: { total: 95040, cancelled: 95040 } });
  await expect(verifyMemberPayment(order, "msub_1")).rejects.toMatchObject({ code: "payment_needs_review" });
});
it("normalizes provider errors without leaking internal text", async () => {
  mocks.get.mockRejectedValue(new Error("secret supplier response"));
  await expect(verifyMemberPayment(order, "msub_1")).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
});
it("requires a second read even for a terminal failure", async () => {
  mocks.get.mockResolvedValue({ ...payment, status: "FAILED", paidAt: undefined, amount: { total: 95040, cancelled: 0 } });
  expect((await verifyMemberPayment(order, "msub_1")).paidAt).toBeNull();
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
