import { beforeEach, expect, it, vi } from "vitest";
import type { SubscriptionOrder } from "@prisma/client";

const f = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), owned: vi.fn(), find: vi.fn(), settle: vi.fn(), mark: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: f.query } }));
vi.mock("../orders", () => ({ ownedOrder: f.owned }));
vi.mock("@/lib/danal/iamport-rest", () => ({ findImpUidByMerchantUid: f.find }));
vi.mock("../payment-callback", () => ({ settleMemberOrder: f.settle }));
vi.mock("../record-payment", () => ({ markNeedsReview: f.mark }));
import { POST } from "@/app/api/member-subscription/orders/[orderId]/recover/route";
import { MemberError } from "../errors";

const order = { id: "o1", orderId: "msub_1", userId: "u1", status: "pending", appliedAt: null, providerTransactionId: null } as SubscriptionOrder;
const context = { params: Promise.resolve({ orderId: "msub_1" }) };
function request() {
  return new Request("https://vestra.ai.kr/api/member-subscription/orders/msub_1/recover", {
    method: "POST", headers: { origin: "https://vestra.ai.kr", "content-type": "application/json" }, body: "{}",
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  f.auth.mockResolvedValue({ user: { id: "u1" } });
  f.query.mockResolvedValue([{ count: 1, resetTime: new Date(Date.now() + 60_000) }]);
  f.owned.mockResolvedValue(order);
  f.find.mockResolvedValue("imp_1");
  f.mark.mockResolvedValue(undefined);
});
it.each(["payment_pending", "payment_needs_review"] as const)("returns newly discovered %s as a 200 state with applied:false", async code => {
  f.settle.mockRejectedValue(new MemberError(code));
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: code === "payment_pending" ? "pending" : "needs_review", applied: false });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.owned).toHaveBeenCalledWith("u1", "msub_1");
  if (code === "payment_needs_review") expect(f.mark).toHaveBeenCalledExactlyOnceWith(order);
  else expect(f.mark).not.toHaveBeenCalled();
});
it("returns an already flagged order as a 409 error before contacting the provider", async () => {
  f.owned.mockResolvedValue({ ...order, status: "needs_review" });
  const response = await POST(request(), context);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "payment_needs_review", error: expect.any(String) });
  expect(f.find).not.toHaveBeenCalled();
  expect(f.settle).not.toHaveBeenCalled();
});
it("returns a verified applied payment as a 200 paid state", async () => {
  f.settle.mockResolvedValue({ ...order, status: "paid", appliedAt: new Date() });
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "paid", applied: true });
});
