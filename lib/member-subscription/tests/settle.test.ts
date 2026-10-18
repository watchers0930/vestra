import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
const f = vi.hoisted(() => ({ verify: vi.fn(), activate: vi.fn(), reversed: vi.fn(), record: vi.fn(), mark: vi.fn() }));
vi.mock("../orders", () => ({ ownedOrder: vi.fn() }));
vi.mock("../callback-context", () => ({ verifyCallbackContext: vi.fn() }));
vi.mock("../verification", () => ({ verifyMemberPayment: f.verify }));
vi.mock("../record-payment", () => ({ recordMemberPayment: f.record, markNeedsReview: f.mark, markReversed: f.reversed }));
vi.mock("../activation", () => ({ activateMemberOrder: f.activate }));
import { settleMemberOrder } from "../payment-callback";

const paid = { id: "o1", orderId: "msub_1", userId: "u1", status: "paid", providerTransactionId: "imp_1",
  nonceConsumedAt: new Date(), appliedAt: null } as unknown as SubscriptionOrder;

beforeEach(() => { vi.clearAllMocks(); f.activate.mockResolvedValue({ ...paid, appliedAt: new Date() }); });

// HIGH3: a paid-but-unapplied order may be refunded between record and a delayed activation.
it("reverify marks a refunded paid order reversed and refuses activation", async () => {
  f.verify.mockResolvedValue({ status: "canceled" });
  await expect(settleMemberOrder(paid, "imp_1", true)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.reversed).toHaveBeenCalledWith(paid, "canceled");
  expect(f.activate).not.toHaveBeenCalled();
});
it("reverify activates when the PG still reports the charge as paid", async () => {
  f.verify.mockResolvedValue({ status: "paid" });
  await settleMemberOrder(paid, "imp_1", true);
  expect(f.verify).toHaveBeenCalledWith(paid, "imp_1");
  expect(f.reversed).not.toHaveBeenCalled();
  expect(f.activate).toHaveBeenCalledWith("u1", "msub_1");
});
it("immediate callback replay (no reverify) activates idempotently without re-reading the PG", async () => {
  await settleMemberOrder(paid, "imp_1");
  expect(f.verify).not.toHaveBeenCalled();
  expect(f.activate).toHaveBeenCalledWith("u1", "msub_1");
});
