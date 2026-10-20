import { afterEach, beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), owned: vi.fn(), callback: vi.fn(), recover: vi.fn(), trial: vi.fn(), status: vi.fn(), cron: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: f.query } }));
vi.mock("../orders", () => ({ createMemberOrder: f.create, ownedOrder: f.owned, orderStatus: (v: unknown) => v }));
vi.mock("../payment-callback", () => ({ memberPaymentCallback: f.callback }));
vi.mock("../recovery", () => ({ recoverMemberOrder: f.recover }));
vi.mock("../trial", () => ({ startMemberTrial: f.trial }));
vi.mock("../status", () => ({ memberSubscriptionStatus: f.status }));
vi.mock("../cron", () => ({ runMemberLifecycle: f.cron }));
import { POST as orders } from "@/app/api/member-subscription/orders/route";
import { GET as order } from "@/app/api/member-subscription/orders/[orderId]/route";
import { POST as callback } from "@/app/api/member-subscription/payment/callback/route";
import { POST as recover } from "@/app/api/member-subscription/orders/[orderId]/recover/route";
import { POST as trial } from "@/app/api/member-subscription/trial/route";
import { GET as status } from "@/app/api/member-subscription/status/route";
import { GET as cron } from "@/app/api/cron/member-subscription-lifecycle/route";
import { MemberError } from "../errors";
import deployment from "@/vercel.json";
const params = { params: Promise.resolve({ orderId: "msub_1" }) };
const input = { purpose: "initial", plan: "PRO", durationMonths: 12, productKind: "standard", idempotencyKey: "acde0091-7924-4ae4-83c1-6f39a02a29a1" };
const request = (body: unknown, origin = "https://vestra.ai.kr") => new Request("https://vestra.ai.kr/api", {
  method: "POST", body: JSON.stringify(body), headers: { origin, "content-type": "application/json" },
});
beforeEach(() => {
  vi.clearAllMocks(); f.auth.mockResolvedValue({ user: { id: "u1" } });
  f.query.mockResolvedValue([{ count: 1, resetTime: new Date(Date.now() + 60_000) }]);
});
afterEach(() => vi.unstubAllEnvs());
it("rejects missing sessions on every member route with the common envelope", async () => {
  f.auth.mockResolvedValue(null);
  const responses = await Promise.all([orders(request({})), order(request({}), params), callback(request({})),
    recover(request({}), params), trial(request({})), status()]);
  for (const response of responses) {
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: expect.any(String), code: "unauthorized" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
it("uses server session userId and exact success status/envelope for all routes", async () => {
  const created = { orderId: "msub_1", amount: 95040, currency: "KRW", plan: "PRO", durationMonths: 12, status: "pending", payment: {} };
  f.create.mockResolvedValue(created);
  const result = await orders(request(input)); expect(result.status).toBe(201); expect(await result.json()).toEqual(created);
  expect(f.create).toHaveBeenCalledWith("u1", input);
  f.owned.mockResolvedValue({ orderId: "msub_1", status: "paid", applied: true });
  expect((await order(request({}), params)).status).toBe(200); expect(f.owned).toHaveBeenCalledWith("u1", "msub_1");
  const context = { paymentId: "msub_1", imp_uid: "msub_1", callbackContext: "abc", callbackSignature: "a".repeat(64) };
  f.callback.mockResolvedValue({ ok: true });
  expect(await (await callback(request(context))).json()).toEqual({ ok: true });
  expect(f.callback).toHaveBeenCalledWith("u1", context);
  f.recover.mockResolvedValue({ status: "pending", applied: false });
  expect(await (await recover(request({}), params)).json()).toEqual({ status: "pending", applied: false });
  expect(f.recover).toHaveBeenCalledWith("u1", "msub_1", undefined);
  f.trial.mockResolvedValue({ status: "trialing", plan: "PRO", trialEndsAt: "2026-10-23T00:00:00Z", monitoringLimit: 5 });
  expect((await trial(request({ plan: "PRO" }))).status).toBe(201); expect(f.trial).toHaveBeenCalledWith("u1", "PRO");
  f.status.mockResolvedValue({ plan: "FREE", status: "active" });
  expect((await status()).status).toBe(200); expect(f.status).toHaveBeenCalledWith("u1");
});
it("rejects tampering and permanent ownership errors with fixed codes", async () => {
  expect((await orders(request({ ...input, amount: 1 }))).status).toBe(400); expect(f.create).not.toHaveBeenCalled();
  expect((await orders(request(input, "https://evil.invalid"))).status).toBe(403);
  expect(await (await orders(request({ ...input, durationMonths: 2 }))).json()).toMatchObject({ code: "invalid_duration" });
  expect(await (await callback(request({ imp_uid: "imp_1" }))).json()).toMatchObject({ code: "payment_failed" });
  f.owned.mockRejectedValue(new MemberError("not_found"));
  expect((await order(request({}), params)).status).toBe(404);
});
it("requires the actual cron secret and returns only aggregated values", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await cron(new Request("https://vestra.ai.kr/api"))).status).toBe(403);
  vi.stubEnv("CRON_SECRET", "fixture-secret");
  expect((await cron(new Request("https://vestra.ai.kr/api", { method: "GET", headers: { authorization: "Bearer wrong" } }))).status).toBe(403);
  expect((await cron(new Request("https://vestra.ai.kr/api", { headers: { authorization: "Bearer fixture-secreX" } }))).status).toBe(403);
  expect(f.cron).not.toHaveBeenCalled();
  f.cron.mockResolvedValue({ recovered: 1, expired: 2, locked: 3, notified: 4 });
  const result = await cron(new Request("https://vestra.ai.kr/api", { method: "GET", headers: { authorization: "Bearer fixture-secret" } }));
  expect(result.status).toBe(200); expect(await result.json()).toEqual({ recovered: 1, expired: 2, locked: 3, notified: 4 });
});

it("registers the lifecycle GET handler in the Vercel cron schedule", () => {
  expect(deployment.crons).toContainEqual({ path: "/api/cron/member-subscription-lifecycle", schedule: "0 * * * *" });
});
