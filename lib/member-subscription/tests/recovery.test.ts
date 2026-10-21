import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
const f = vi.hoisted(() => ({ owned: vi.fn(), settle: vi.fn(), mark: vi.fn() }));
vi.mock("../orders", () => ({ ownedOrder: f.owned }));
vi.mock("../payment-callback", () => ({ settleMemberOrder: f.settle }));
vi.mock("../record-payment", () => ({ markNeedsReview: f.mark }));
import { recoverMemberOrder } from "../recovery";
import { MemberError } from "../errors";
const order = { id: "o1", orderId: "msub_1", userId: "u1", status: "pending", appliedAt: null, providerTransactionId: null } as SubscriptionOrder;
beforeEach(() => { vi.clearAllMocks(); f.owned.mockResolvedValue(order); f.mark.mockResolvedValue(undefined); });
// 하이브리드: V2 조회는 orderId 단일 키라 imp_uid 역탐색 없이 settle(order, reverify)로 재검증한다.
it("reverifies the owned order by orderId and reports applied state", async () => {
  f.settle.mockResolvedValue({ ...order, status: "paid", appliedAt: new Date() });
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "paid", applied: true });
  expect(f.owned).toHaveBeenCalledWith("u1", "msub_1");
  expect(f.settle).toHaveBeenCalledWith(order, true);
});
it("never invents payment when no transaction exists (settle reports pending)", async () => {
  f.settle.mockRejectedValue(new MemberError("payment_pending"));
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "pending", applied: false });
  expect(f.settle).toHaveBeenCalledWith(order, true);
});
it("keeps ambiguous verification in needs_review instead of activating", async () => {
  f.settle.mockRejectedValue(new MemberError("payment_needs_review"));
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "needs_review", applied: false });
  expect(f.mark).toHaveBeenCalledWith(order);
});
it("cannot clear an existing needs_review order", async () => {
  f.owned.mockResolvedValue({ ...order, status: "needs_review" });
  await expect(recoverMemberOrder("u1", "msub_1", "imp_1")).rejects.toMatchObject({ code: "payment_needs_review" });
  expect(f.settle).not.toHaveBeenCalled();
});
it("keeps transient provider errors separate from definite failures", async () => {
  f.settle.mockRejectedValue(new MemberError("provider_unavailable"));
  await expect(recoverMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code: "provider_unavailable" });
  expect(f.mark).not.toHaveBeenCalled();
});
it("short-circuits a terminal order with no explicit transaction hint", async () => {
  f.owned.mockResolvedValue({ ...order, status: "canceled" });
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "canceled", applied: false });
  expect(f.settle).not.toHaveBeenCalled();
});
it("retains ownership rejection before provider lookup", async () => {
  f.owned.mockRejectedValue(new MemberError("not_found"));
  await expect(recoverMemberOrder("other", "msub_1")).rejects.toMatchObject({ code: "not_found" });
  expect(f.settle).not.toHaveBeenCalled();
});
it.each([["payment_failed", 400], ["not_found", 404]])("preserves permanent provider rejection %s", async (code, status) => {
  f.settle.mockRejectedValue(new MemberError(code as "payment_failed" | "not_found"));
  await expect(recoverMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code, status });
  expect(f.mark).not.toHaveBeenCalled();
});
