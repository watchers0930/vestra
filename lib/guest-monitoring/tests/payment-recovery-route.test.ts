import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const f = vi.hoisted(() => ({ session: vi.fn(), recover: vi.fn(), callback: vi.fn(), limit: vi.fn(), ip: vi.fn() }));
vi.mock("@/lib/guest-monitoring/session", () => ({ requireSession: f.session }));
vi.mock("@/lib/guest-monitoring/recover-pending-payment", () => ({ recoverPendingPayment: f.recover }));
vi.mock("@/lib/guest-monitoring/activation", () => ({ paymentCallback: f.callback }));
vi.mock("@/lib/guest-monitoring/rate-limit-keys", () => ({ guestLimit: f.limit, ipLimit: f.ip }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: vi.fn() }));
import { POST } from "@/app/api/guest-monitoring/payment/callback/route";
import { GuestError } from "../errors";
const principal = { id: "verified-session", verifiedIdentityHash: "identity", purpose: "status", draftId: null };
function request(query = "recoverOrderId=ord_fixture", origin: string | null = "http://localhost:3000", body?: string) {
  return new NextRequest(`http://localhost:3000/api/guest-monitoring/payment/callback?${query}`, {
    method: "POST", ...(body !== undefined ? { body } : {}), headers: {
      ...(origin !== null ? { origin } : {}), referer: "http://localhost:3000/",
    },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GUEST_PAYMENT_MODE", "portone_v1"); vi.stubEnv("DANAL_PROVIDER", "");
  vi.stubEnv("GUEST_MONITORING_ENABLED", "true"); vi.stubEnv("PII_ENCRYPTION_KEY", "fixture-key");
  vi.stubEnv("PII_SALT", "fixture-salt"); vi.stubEnv("SEARCH_INDEX_KEY", "fixture-signing-key");
  f.session.mockResolvedValue(principal); f.recover.mockResolvedValue({ ok: true });
});
afterEach(() => vi.unstubAllEnvs());
it("connects a body-free POST to recovery using only the authenticated principal", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(f.session).toHaveBeenCalledWith(expect.anything(), ["apply", "status", "renewal"]);
  expect(f.limit).toHaveBeenCalledWith("callback:payment", principal.id, 20);
  expect(f.recover).toHaveBeenCalledWith(principal, "ord_fixture");
  expect(f.callback).not.toHaveBeenCalled();
});
it.each([null, "null", "https://hostile.example"])("rejects Origin %s despite an allowed Referer", async origin => {
  expect((await POST(request(undefined, origin))).status).toBe(403);
  expect(f.session).not.toHaveBeenCalled(); expect(f.recover).not.toHaveBeenCalled();
});
it("requires a valid session before recovery", async () => {
  f.session.mockRejectedValue(new GuestError("session_required", 401));
  expect((await POST(request())).status).toBe(401); expect(f.recover).not.toHaveBeenCalled();
});
it.each(["{}", '{"verifiedIdentityHash":"another","imp_uid":"imp_fake"}', "invalid-json"])("rejects request bodies rather than trusting their recovery data: %s", async body => {
  expect((await POST(request(undefined, undefined, body))).status).toBe(400);
  expect(f.recover).not.toHaveBeenCalled(); expect(f.callback).not.toHaveBeenCalled();
});
it("rejects duplicate order selectors", async () => {
  expect((await POST(request("recoverOrderId=ord_a&recoverOrderId=ord_b"))).status).toBe(400);
  expect(f.recover).not.toHaveBeenCalled();
});
it("rate limits before candidate lookup", async () => {
  f.limit.mockRejectedValue(new GuestError("rate_limited", 429));
  expect((await POST(request())).status).toBe(429); expect(f.recover).not.toHaveBeenCalled();
});
it.each([["not_found", 404], ["payment_pending", 409], ["payment_needs_review", 409], ["provider_unavailable", 503]] as const)("preserves sanitized recovery outcome %s", async (code, status) => {
  f.recover.mockRejectedValue(new GuestError(code, status));
  const response = await POST(request());
  expect(response.status).toBe(status); expect(await response.json()).toMatchObject({ code });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("keeps recovery unavailable in mock mode", async () => {
  vi.stubEnv("GUEST_PAYMENT_MODE", "mock");
  expect((await POST(request())).status).toBe(400); expect(f.recover).not.toHaveBeenCalled();
});
