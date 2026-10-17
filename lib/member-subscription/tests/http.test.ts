import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));
import { assertMemberOrigin, memberBody, memberEndpoint, memberJson, memberMutation, memberRateLimit, requireUser } from "../http";
import { orderSchema, recoverSchema } from "../schemas";
import { prisma } from "@/lib/prisma";
import { MemberError } from "../errors";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const req = (origin?: string, referer?: string) => new Request("https://vestra.ai.kr/api/member-subscription/orders", {
  method: "POST", headers: { ...(origin ? { origin } : {}), ...(referer ? { referer } : {}) },
});
it("requires login independently of input", () => {
  expect(() => requireUser(null)).toThrow();
  expect(requireUser({ user: { id: "u1" } })).toBe("u1");
});
it("requires explicit matching Origin and disallows Referer bypass", () => {
  expect(() => assertMemberOrigin(req("https://vestra.ai.kr"))).not.toThrow();
  expect(() => assertMemberOrigin(req(undefined, "https://vestra.ai.kr/pricing"))).toThrow();
  expect(() => assertMemberOrigin(req("https://evil.invalid", "https://vestra.ai.kr/pricing"))).toThrow();
  expect(() => assertMemberOrigin(req("null"))).toThrow();
});
it("enforces declared and actual body sizes before parsing", async () => {
  await expect(memberMutation(new Request("https://vestra.ai.kr/", { method: "POST", headers: { origin: "https://vestra.ai.kr", "content-length": "16385" } }), "u1")).rejects.toMatchObject({ status: 413 });
  const large = new Request("https://vestra.ai.kr/", { method: "POST", body: JSON.stringify({ value: "한".repeat(6000) }), headers: { "content-type": "application/json" } });
  await expect(memberBody(large, recoverSchema)).rejects.toMatchObject({ status: 413 });
});
it("rejects malformed JSON, forbidden fields, and wrong content type", async () => {
  for (const body of ["{", "null", '{"amount":0}']) {
    const request = new Request("https://vestra.ai.kr/", { method: "POST", body, headers: { "content-type": "application/json" } });
    await expect(memberBody(request, orderSchema)).rejects.toMatchObject({ code: "invalid_input" });
  }
  await expect(memberBody(new Request("https://vestra.ai.kr/", { method: "POST", body: "{}" }), recoverSchema)).rejects.toThrow();
});
it("normalizes failures and sets no-store on all responses", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const internal = await memberEndpoint(async () => { throw new Error("secret database path"); });
  expect(internal.status).toBe(503);
  expect(await internal.text()).not.toContain("secret");
  expect(internal.headers.get("cache-control")).toBe("no-store");
  const denied = await memberEndpoint(async () => { throw new MemberError("forbidden"); });
  expect(denied.status).toBe(403);
  expect(memberJson({ ok: true }).headers.get("cache-control")).toBe("no-store");
});
it("rate limits atomically with retry headers", async () => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: 31, resetTime: new Date(Date.now() + 60_000) }]);
  await expect(memberRateLimit("u1", "mutate")).rejects.toMatchObject({ status: 429, headers: { "X-RateLimit-Remaining": "0" } });
});
