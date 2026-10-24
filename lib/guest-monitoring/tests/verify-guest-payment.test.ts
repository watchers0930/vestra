import { beforeEach, describe, expect, it, vi } from "vitest";

const g = vi.hoisted(() => ({ getV2: vi.fn() }));
vi.mock("@/lib/danal/portone-v2-rest", () => ({ getPaymentByIdV2: g.getV2 }));
vi.mock("@/lib/member-subscription/provider", () => ({
  memberProviderConfig: () => ({ mid: "9810030929", storeId: "store-x", channelEnvironment: "test", impCode: "imp88200033", merchantConfigVersion: "v1" }),
}));

import type { GuestMonitoringOrder } from "@prisma/client";
import { verifyGuestPayment } from "../verify-guest-payment";
import { encodeReceipt, type CallbackContext } from "@/lib/danal/portone-callback";

const NONCE = "a".repeat(43);
const now = Date.now();
const ORDER_ID = "ord_" + "b".repeat(32);
const order = {
  orderId: ORDER_ID, amount: 10000, currency: "KRW",
  createdAt: new Date(now - 60_000), expiresAt: new Date(now + 600_000),
  providerReceipt: encodeReceipt({ v: 1, nonce: NONCE, consumed: false }),
};
const orderArg = order as unknown as GuestMonitoringOrder;
const context: CallbackContext = { v: 1, purpose: "guest_payment_v1", paymentId: ORDER_ID,
  orderId: ORDER_ID, storeId: "store-x", amount: 10000, currency: "KRW",
  expiresAt: now + 600_000, nonce: NONCE };

const paidV2 = {
  id: "ord_" + "b".repeat(32), status: "PAID", storeId: "store-x", amount: { total: 10000 }, currency: "KRW",
  channel: { type: "TEST", pgProvider: "DANAL_TPAY", pgMerchantId: "9810030929" },
  version: "V1", paidAt: new Date(now - 10_000).toISOString(),
};

beforeEach(() => vi.resetAllMocks());

describe("verifyGuestPayment (V2 API 검증)", () => {
  it("정상 PAID → status=paid, 정산키=orderId", async () => {
    g.getV2.mockResolvedValue({ ...paidV2 });
    const r = await verifyGuestPayment(orderArg, context);
    expect(r.status).toBe("paid");
    expect(r.transactionId).toBe(ORDER_ID);
    expect(r.verificationReference).toBe(ORDER_ID);
    expect(g.getV2).toHaveBeenCalledTimes(2); // 이중조회
  });

  it("V2 404(null) → payment_pending", async () => {
    g.getV2.mockResolvedValue(null);
    await expect(verifyGuestPayment(orderArg, context)).rejects.toMatchObject({ code: "payment_pending" });
  });

  it("PAID인데 PG가 다날 아님 → payment_failed (타 PG 차단)", async () => {
    g.getV2.mockResolvedValue({ ...paidV2, channel: { ...paidV2.channel, pgProvider: "KCP" } });
    await expect(verifyGuestPayment(orderArg, context)).rejects.toMatchObject({ code: "payment_failed" });
  });

  it("PAID인데 MID 불일치 → payment_failed", async () => {
    g.getV2.mockResolvedValue({ ...paidV2, channel: { ...paidV2.channel, pgMerchantId: "9999999999" } });
    await expect(verifyGuestPayment(orderArg, context)).rejects.toMatchObject({ code: "payment_failed" });
  });

  it("nonce 불일치(바꿔치기) → payment_failed", async () => {
    g.getV2.mockResolvedValue({ ...paidV2 });
    await expect(verifyGuestPayment(orderArg, { ...context, nonce: "c".repeat(43) }))
      .rejects.toMatchObject({ code: "payment_failed" });
    expect(g.getV2).not.toHaveBeenCalled(); // 바인딩 실패 시 V2 조회 전 차단
  });

  it("이중조회 상태 변화(1차 PAID, 2차 CANCELLED) → payment_needs_review", async () => {
    g.getV2.mockResolvedValueOnce({ ...paidV2 })
      .mockResolvedValueOnce({ ...paidV2, status: "CANCELLED", amount: { total: 10000, cancelled: 10000 } });
    await expect(verifyGuestPayment(orderArg, context)).rejects.toMatchObject({ code: "payment_needs_review" });
  });

  it("금액 불일치 → payment_failed", async () => {
    g.getV2.mockResolvedValue({ ...paidV2, amount: { total: 5000 } });
    await expect(verifyGuestPayment(orderArg, context)).rejects.toMatchObject({ code: "payment_failed" });
  });
});
