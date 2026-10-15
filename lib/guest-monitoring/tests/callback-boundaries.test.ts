import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const f = vi.hoisted(() => ({ ip: vi.fn(), transaction: vi.fn(), verifyIdentity: vi.fn(), verifyPayment: vi.fn(), getPayment: vi.fn() }));
vi.mock("@/lib/guest-monitoring/rate-limit-keys", () => ({ ipLimit: f.ip, guestLimit: f.transaction }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: () => ({
  identity: { verifyResult: f.verifyIdentity }, payment: { verifyPayment: f.verifyPayment, getPayment: f.getPayment },
}) }));
import { endpoint, json } from "../http";
import { GuestError } from "../errors";
import { attachBrowser, attachSession, BROWSER_COOKIE, SESSION_COOKIE, consumeIdentity } from "../session";
import { paymentCallback } from "../activation";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GUEST_MONITORING_ENABLED", "true");
  vi.stubEnv("PII_ENCRYPTION_KEY", "test-only-encryption-key");
  vi.stubEnv("PII_SALT", "test-only-salt");
  vi.stubEnv("SEARCH_INDEX_KEY", "test-only-search");
});
afterEach(() => vi.unstubAllEnvs());
it("rate limits cross-site callbacks before body reads or provider work", async () => {
  f.ip.mockRejectedValue(new GuestError("rate_limited", 429, { "X-RateLimit-Remaining": "0" }));
  const run = vi.fn(async req => { await req.json(); return json({ ok: true }); });
  const response = await endpoint(run, { callback: true })(new NextRequest("https://vestra.test/api/callback", { method: "POST", body: "invalid-json", headers: { origin: "https://provider.test" } }));
  expect(response.status).toBe(429);
  expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
  expect(run).not.toHaveBeenCalled();
  expect(f.ip).toHaveBeenCalledWith(expect.anything(), "callback", 120);
});
it("accepts provider callbacks without Origin and still applies the IP bound", async () => {
  const response = await endpoint(async () => json({ ok: true }), { callback: true })(new NextRequest("https://vestra.test/api/callback", { method: "POST" }));
  expect(response.status).toBe(200);
  expect(f.ip).toHaveBeenCalledOnce();
});
it("feature off skips callback rate limiter and handler entirely", async () => {
  vi.stubEnv("GUEST_MONITORING_ENABLED", "false");
  const run = vi.fn();
  expect((await endpoint(run, { callback: true })(new NextRequest("https://vestra.test/api/callback"))).status).toBe(404);
  expect(f.ip).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});
it("limits verified payment transactions before provider lookup", async () => {
  f.verifyPayment.mockResolvedValue({ orderId: "verified-order" });
  f.transaction.mockRejectedValue(new GuestError("rate_limited", 429));
  await expect(paymentCallback({})).rejects.toMatchObject({ status: 429 });
  expect(f.transaction).toHaveBeenCalledWith("callback:payment", "verified-order", 20);
  expect(f.getPayment).not.toHaveBeenCalled();
});
it("limits verified identity nonces before session DB access", async () => {
  f.verifyIdentity.mockResolvedValue({ nonce: "verified-nonce" });
  f.transaction.mockRejectedValue(new GuestError("rate_limited", 429));
  await expect(consumeIdentity(new NextRequest("https://vestra.test"), {})).rejects.toMatchObject({ status: 429 });
  expect(f.transaction).toHaveBeenCalledWith("callback:identity", "verified-nonce", 20);
});
it.each(["production", "test"])("uses matching callback-compatible browser and session cookies in %s", mode => {
  vi.stubEnv("NODE_ENV", mode);
  const response = NextResponse.json({ ok: true });
  attachBrowser(response, "browser");
  attachSession(response, "session");
  for (const name of [BROWSER_COOKIE, SESSION_COOKIE]) {
    expect(response.cookies.get(name)).toMatchObject({ httpOnly: true, secure: mode === "production",
      sameSite: mode === "production" ? "none" : "lax", path: "/api/guest-monitoring", maxAge: 900 });
  }
});
