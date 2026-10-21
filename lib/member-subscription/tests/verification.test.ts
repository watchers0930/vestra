import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
import type { V2Payment } from "@/lib/danal/portone-v2-schemas";
const mocks = vi.hoisted(() => ({ get: vi.fn(), config: { impCode: "imp88200033", mid: "9810030929", storeId: "store-x", channelEnvironment: "test", merchantConfigVersion: "fixture" } }));
vi.mock("@/lib/danal/portone-v2-rest", () => ({ getPaymentByIdV2: mocks.get }));
vi.mock("../provider", () => ({ memberProviderConfig: () => mocks.config }));
import { validatePayment, verifyMemberPayment } from "../verification";
const order = { id: "o1", orderId: "msub_1", amount: 95040, monthlyPrice: 9900, durationMonths: 12, discountPercent: 20,
  currency: "KRW", channelEnvironment: "test", merchantConfigVersion: "fixture",
  createdAt: new Date("2026-10-01T00:00:00Z"), expiresAt: new Date("2026-10-01T00:15:00Z") } as SubscriptionOrder;
const payment: V2Payment = { id: "msub_1", transactionId: "imp_1", status: "PAID", storeId: "store-x",
  amount: { total: 95040, paid: 95040, cancelled: 0 }, currency: "KRW",
  channel: { type: "TEST", pgProvider: "DANAL_TPAY", pgMerchantId: "9810030929", key: "channel-key-x" },
  version: "V1", paidAt: "2026-10-01T00:01:00Z" };
const validate = (p: V2Payment, o = order) => validatePayment(o, p, mocks.config as Parameters<typeof validatePayment>[2], new Date("2026-10-01T00:05:00Z"));
beforeEach(() => vi.clearAllMocks());
it("accepts only the exact verified snapshot", () => {
  expect(validate(payment).status).toBe("paid");
  expect(validate(payment).impUid).toBe("msub_1"); // 정산 식별자 = orderId
  expect(validate(payment).evidence).not.toHaveProperty("transactionId");
});
it.each([
  { id: "msub_other" }, { amount: { total: 1 } }, { amount: { total: 95040.1 } }, { currency: "USD" },
  { storeId: "store-other" }, { paidAt: "2026-10-01T00:16:00Z" }, { paidAt: "2026-09-30T23:59:59Z" },
  { amount: { total: 95040, cancelled: 1 } }, { status: "OTHER" },
])("rejects payment field mismatch %j", patch => {
  expect(() => validate({ ...payment, ...patch } as V2Payment)).toThrow();
});
it.each([
  { pgProvider: "DANAL", pgMerchantId: "9810030929", type: "TEST" },     // 다른 PG
  { pgProvider: "DANAL_TPAY", pgMerchantId: "99999999", type: "TEST" },  // 다른 MID
  { pgProvider: "DANAL_TPAY", pgMerchantId: "9810030929", type: "LIVE" },// 실결제 채널(테스트 주문에 금지)
])("rejects channel mismatch %j", ch => {
  expect(() => validate({ ...payment, channel: { ...ch, key: "k" } } as V2Payment)).toThrow();
});
it("rejects missing channel / configuration changes / bad order snapshot", () => {
  expect(() => validate({ ...payment, channel: undefined } as V2Payment)).toThrow();
  expect(() => validate(payment, { ...order, merchantConfigVersion: "changed" })).toThrow();
  expect(() => validate(payment, { ...order, monthlyPrice: 10000 })).toThrow();
});
it("distinguishes pending and terminal without manufacturing paidAt", () => {
  expect(() => validate({ ...payment, status: "READY", paidAt: undefined })).toThrow("결제 확인 중");
  for (const status of ["FAILED", "CANCELLED"]) {
    const value = validate({ ...payment, status, paidAt: undefined, amount: { total: 95040, cancelled: 0 } });
    expect(value.paidAt).toBeNull();
  }
  expect(() => validate({ ...payment, status: "FAILED" })).toThrow(); // 완료흔적(paidAt) 있는 FAILED는 거부
});
it("requires two independent matching reads", async () => {
  mocks.get.mockResolvedValue(payment);
  expect((await verifyMemberPayment(order)).status).toBe("paid");
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it("does not activate when status changes between reads", async () => {
  mocks.get.mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, status: "CANCELLED", amount: { total: 95040, cancelled: 95040 } });
  await expect(verifyMemberPayment(order)).rejects.toMatchObject({ code: "payment_needs_review" });
});
it("normalizes provider errors without leaking internal text", async () => {
  mocks.get.mockRejectedValue(new Error("secret supplier response"));
  await expect(verifyMemberPayment(order)).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
});
it("requires a second read even for a terminal failure", async () => {
  mocks.get.mockResolvedValue({ ...payment, status: "FAILED", paidAt: undefined, amount: { total: 95040, cancelled: 0 } });
  expect((await verifyMemberPayment(order)).paidAt).toBeNull();
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
