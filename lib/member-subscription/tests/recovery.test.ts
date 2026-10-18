import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";
const f = vi.hoisted(() => ({ owned: vi.fn(), find: vi.fn(), settle: vi.fn(), mark: vi.fn() }));
vi.mock("../orders", () => ({ ownedOrder: f.owned }));
vi.mock("@/lib/danal/iamport-rest", () => ({ findImpUidByMerchantUid: f.find }));
vi.mock("../payment-callback", () => ({ settleMemberOrder: f.settle }));
vi.mock("../record-payment", () => ({ markNeedsReview: f.mark }));
import { recoverMemberOrder } from "../recovery";
import { MemberError } from "../errors";
const order = { id: "o1", orderId: "msub_1", userId: "u1", status: "pending", appliedAt: null, providerTransactionId: null } as SubscriptionOrder;
beforeEach(() => { vi.clearAllMocks(); f.owned.mockResolvedValue(order); f.mark.mockResolvedValue(undefined); });
it("searches merchant candidates then settles the same owned order", async () => {
  f.find.mockResolvedValue("imp_1"); f.settle.mockResolvedValue({ ...order, status: "paid", appliedAt: new Date() });
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "paid", applied: true });
  expect(f.owned).toHaveBeenCalledWith("u1", "msub_1"); expect(f.find).toHaveBeenCalledWith("msub_1");
  expect(f.settle).toHaveBeenCalledWith(order, "imp_1", true);
});
it("never invents payment when no transaction exists", async () => {
  f.find.mockResolvedValue(null);
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "pending", applied: false });
  expect(f.settle).not.toHaveBeenCalled();
});
it("keeps ambiguous candidates in needs_review instead of picking one", async () => {
  f.find.mockRejectedValue({ code: "payment_needs_review", message: "untrusted supplier detail" });
  expect(await recoverMemberOrder("u1", "msub_1")).toEqual({ status: "needs_review", applied: false });
  expect(f.mark).toHaveBeenCalledWith(order); expect(f.settle).not.toHaveBeenCalled();
});
it("cannot clear an existing needs_review order", async () => {
  f.owned.mockResolvedValue({ ...order, status: "needs_review" });
  await expect(recoverMemberOrder("u1", "msub_1", "imp_1")).rejects.toMatchObject({ code: "payment_needs_review" });
  expect(f.find).not.toHaveBeenCalled(); expect(f.settle).not.toHaveBeenCalled();
});
it("keeps transient provider errors separate from definite failures", async () => {
  f.find.mockRejectedValue(new Error("private token error"));
  await expect(recoverMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code: "provider_unavailable" });
  expect(f.mark).not.toHaveBeenCalled();
});
it("revalidates an explicit transaction without candidate search", async () => {
  f.settle.mockRejectedValue(new MemberError("payment_pending"));
  expect(await recoverMemberOrder("u1", "msub_1", "imp_1")).toEqual({ status: "pending", applied: false });
  expect(f.find).not.toHaveBeenCalled(); expect(f.settle).toHaveBeenCalledWith(order, "imp_1", true);
});
it("retains ownership rejection before provider lookup", async () => {
  f.owned.mockRejectedValue(new MemberError("not_found"));
  await expect(recoverMemberOrder("other", "msub_1")).rejects.toMatchObject({ code: "not_found" });
  expect(f.find).not.toHaveBeenCalled();
});
it.each([["payment_failed", 400], ["not_found", 404]])("preserves permanent provider rejection %s", async (code, status) => {
  f.find.mockRejectedValue({ code, message: "private provider response" });
  await expect(recoverMemberOrder("u1", "msub_1")).rejects.toMatchObject({ code, status });
  expect(f.mark).not.toHaveBeenCalled(); expect(f.settle).not.toHaveBeenCalled();
});
