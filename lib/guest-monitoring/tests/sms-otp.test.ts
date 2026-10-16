import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const f = vi.hoisted(() => ({
  create: vi.fn(), find: vi.fn(), updateMany: vi.fn(), update: vi.fn(), draft: vi.fn(),
  send: vi.fn(), limit: vi.fn(), ip: vi.fn(), provider: vi.fn(), randomInt: vi.fn(),
}));
vi.mock("node:crypto", async original => ({ ...await original<typeof import("node:crypto")>(), randomInt: f.randomInt }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  guestVerificationSession: { create: f.create, findUnique: f.find, updateMany: f.updateMany, update: f.update },
  guestMonitoring: { findFirst: f.draft },
} }));
vi.mock("../transaction", () => ({ locked: async (_identity: string, run: (tx: unknown) => unknown) => run({
  guestMonitoring: { findFirst: f.draft },
}) }));
vi.mock("@/lib/solapi-client", () => ({ sendSms: f.send }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: f.provider }));
vi.mock("../rate-limit-keys", () => ({ guestLimit: f.limit, ipLimit: f.ip }));
import { startOtp, verifyOtp, otpDigest } from "../sms-otp";
import { resolveIdentityMode, OTP_TTL } from "../identity-mode";
import { binding, BROWSER_COOKIE, digest } from "../session-binding";
import { requireSession, startIdentity, SESSION_COOKIE } from "../session";
import { GuestError } from "../errors";
import { guestIdentityHash } from "../identity-hash";
import { POST as startRoute } from "@/app/api/guest-monitoring/identity/start/route";
import { POST as verifyRoute } from "@/app/api/guest-monitoring/identity/verify-otp/route";
import { createOrder } from "../order";

const input = { purpose: "status" as const, guestName: "테스트", guestPhone: "01012345678" };
const payload = { verificationId: "session-1", code: "000042" };
const start = async (req: NextRequest) => await startRoute(req) as NextResponse;
const verify = async (req: NextRequest) => await verifyRoute(req) as NextResponse;
function request(body: unknown = payload, cookie = `${BROWSER_COOKIE}=browser`, ua = "test-browser",
  headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/guest-monitoring/identity/test", {
    method: "POST", body: JSON.stringify(body),
    headers: { origin: "http://localhost:3000", cookie, "user-agent": ua, ...headers },
  });
}
function pending() {
  const identity = guestIdentityHash(input.guestName, input.guestPhone);
  return { id: payload.verificationId, requestNonce: "nonce", purpose: "status", draftId: null,
    inputIdentityHash: identity, browserBindingHash: binding(request(), "browser"),
    providerTxId: `otp:${otpDigest({ nonce: "nonce", inputIdentityHash: identity, code: payload.code })}`,
    tokenHash: "dummy", verifiedIdentityHash: null, verifiedAt: null, consumedAt: null, revokedAt: null,
    expiresAt: new Date(Date.now() + OTP_TTL) };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T00:00:00Z"));
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GUEST_IDENTITY_MODE", "sms_otp");
  vi.stubEnv("GUEST_MONITORING_ENABLED", "true");
  vi.stubEnv("PII_ENCRYPTION_KEY", "test-only-encryption");
  vi.stubEnv("PII_SALT", "test-only-salt");
  vi.stubEnv("SEARCH_INDEX_KEY", "test-only-search");
  vi.stubEnv("AUTH_SECRET", "");
  vi.stubEnv("GUEST_IDENTITY_DAILY_LIMIT", "");
  f.randomInt.mockReturnValue(42);
  f.create.mockResolvedValue({ id: payload.verificationId });
  f.find.mockImplementation(async () => pending());
  f.updateMany.mockResolvedValue({ count: 1 });
  f.draft.mockResolvedValue({ id: "draft-1" });
  f.send.mockResolvedValue({ success: true, channel: "sms" });
  f.provider.mockImplementation(() => { throw new GuestError("provider_unavailable", 503); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("OTP creation and provider isolation", () => {
  it.each([undefined, "", "danal", "SMS_OTP", "sms_otp ", "other", "sms_otp"])("resolves explicit mode %s", mode => {
    vi.stubEnv("GUEST_IDENTITY_MODE", mode);
    expect(resolveIdentityMode()).toBe(mode === "sms_otp" ? "sms_otp" : "danal");
  });
  it("pads secure random codes, binds digest to identity/nonce, and exposes only the launch DTO", async () => {
    const result = await startOtp(request(), input);
    expect(f.randomInt).toHaveBeenCalledWith(0, 1_000_000);
    expect(f.send).toHaveBeenCalledWith(input.guestPhone, expect.stringContaining("000042"), { requireReal: true });
    expect(result.data).toEqual({ verificationId: payload.verificationId,
      launch: { mode: "sms_otp", verificationId: payload.verificationId }, expiresAt: "2026-10-15T00:05:00.000Z" });
    const data = f.create.mock.calls[0][0].data;
    expect(data.providerTxId).toBe(`otp:${otpDigest({ nonce: data.requestNonce, inputIdentityHash: data.inputIdentityHash, code: payload.code })}`);
    expect(JSON.stringify([data, result.data])).not.toContain(payload.code);
    expect(JSON.stringify(data)).not.toContain(input.guestPhone);
    expect(JSON.stringify(data)).not.toContain(input.guestName);
    await startOtp(request(), input);
    expect(f.create.mock.calls[1][0].data.requestNonce).not.toBe(data.requestNonce);
    expect(f.create.mock.calls[1][0].data.providerTxId).not.toBe(data.providerTxId);
    expect(f.updateMany.mock.calls[0][0]).toMatchObject({ where: { purpose: "status", verifiedAt: null,
      consumedAt: null, revokedAt: null, providerTxId: { startsWith: "otp:" } }, data: { revokedAt: new Date() } });
  });
  it.each(["route", "direct"])("bypasses unavailable Danal in production via %s", async path => {
    if (path === "route") {
      const response = await start(request(input));
      expect(response.status).toBe(200);
      expect(response.cookies.has(BROWSER_COOKIE)).toBe(true);
    } else await startIdentity(request(), input);
    expect(f.provider).not.toHaveBeenCalled();
  });
  it("keeps unconfigured Danal failure before rate limits and SMS", async () => {
    vi.stubEnv("GUEST_IDENTITY_MODE", "danal");
    const response = await start(request(input));
    expect(response.status).toBe(503);
    expect(f.ip).toHaveBeenCalledTimes(1); // Common wrapper only.
    expect(f.send).not.toHaveBeenCalled();
  });
  it("preserves configured Danal launch and session shape", async () => {
    vi.stubEnv("GUEST_IDENTITY_MODE", "danal");
    const launch = { url: "https://provider.test/identity" };
    const providerStart = vi.fn().mockResolvedValue(launch);
    f.provider.mockReturnValue({ identity: { startVerification: providerStart } });
    const result = await startIdentity(request(), input);
    expect(result.data.launch).toEqual(launch);
    expect(result.data.expiresAt).toBe("2026-10-15T00:15:00.000Z");
    expect(f.create.mock.calls[0][0].data.providerTxId).toBeUndefined();
    expect(f.send).not.toHaveBeenCalled();
  });
  it.each([{ success: false, channel: "sms" }, { success: true, channel: "sms_mock" }, "throw"])("revokes failed delivery %j", async result => {
    if (result === "throw") f.send.mockRejectedValue(new Error("sensitive provider error"));
    else f.send.mockResolvedValue(result);
    await expect(startOtp(request(), input)).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
    expect(f.update).toHaveBeenCalledWith({ where: { id: payload.verificationId }, data: { revokedAt: new Date() } });
    expect(f.provider).not.toHaveBeenCalled();
  });
  it("rejects unavailable apply drafts before session creation and SMS", async () => {
    f.draft.mockResolvedValue(null);
    await expect(startOtp(request(), { ...input, purpose: "apply", draftId: "draft-1", role: "owner" })).rejects.toMatchObject({ status: 404 });
    expect(f.create).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.limit).not.toHaveBeenCalledWith("identity-cost", expect.anything(), expect.anything(), expect.anything());
    expect(f.draft.mock.calls[0][0].where).toMatchObject({ id: "draft-1", status: "pending_payment",
      guestIdentityHash: guestIdentityHash(input.guestName, input.guestPhone), draftExpiresAt: { gt: new Date() } });
  });
});

describe("OTP verification and session contract", () => {
  it.each(["status", "apply"])("issues only HttpOnly cookies for %s and supports requireSession", async purpose => {
    const row = { ...pending(), purpose, draftId: purpose === "apply" ? "draft-1" : null };
    f.find.mockResolvedValue(row);
    const response = await verify(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, purpose });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const raw = response.cookies.get(SESSION_COOKIE)!.value;
    for (const name of [SESSION_COOKIE, BROWSER_COOKIE]) {
      const cookie = response.cookies.get(name)!;
      expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/api/guest-monitoring" });
      expect(cookie.maxAge).toBeUndefined(); // 세션 쿠키(로그아웃 정책)
    }
    const mutation = f.updateMany.mock.calls[0][0];
    expect(mutation.where).toMatchObject({ id: row.id, providerTxId: row.providerTxId,
      inputIdentityHash: row.inputIdentityHash, browserBindingHash: row.browserBindingHash,
      verifiedAt: null, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } });
    // 본인인증 완료 시 만료 = 유휴 10분(이후 요청마다 슬라이딩, 절대 60분 상한).
    expect(mutation.data).toMatchObject({ tokenHash: digest(raw), verifiedIdentityHash: row.inputIdentityHash,
      verifiedAt: new Date(), consumedAt: new Date(), expiresAt: new Date(Date.now() + 600_000) });
    expect(mutation.data.providerTxId).toMatch(/^sms_otp_verified:[0-9a-f-]{36}$/);
    f.find.mockResolvedValue({ ...row, ...mutation.data });
    expect(await requireSession(request({}, `${BROWSER_COOKIE}=browser; ${SESSION_COOKIE}=${raw}`))).toMatchObject({ purpose });
    expect(f.provider).not.toHaveBeenCalled();
  });
  it.each([null, { purpose: "renewal" }, { providerTxId: null }, { providerTxId: "danal-transaction" },
    { providerTxId: "otp:broken" }, { providerTxId: `otp:${"x".repeat(64)}` },
    { expiresAt: new Date("2026-10-15T00:00:00Z") }, { expiresAt: new Date(0) },
    { verifiedAt: new Date() }, { consumedAt: new Date() }, { revokedAt: new Date() },
    { inputIdentityHash: "tampered" }])("uniformly rejects invalid state %j", async patch => {
    f.find.mockResolvedValue(patch === null ? null : { ...pending(), ...patch });
    const response = await verify(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "verification_failed" });
    expect(response.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it.each([["", "test-browser"], [`${BROWSER_COOKIE}=other`, "test-browser"],
    [`${BROWSER_COOKIE}=browser`, "different-UA"]])("rejects changed browser binding %s %s", async (cookie, ua) => {
    expect((await verify(request(payload, cookie, ua))).status).toBe(400);
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it("rejects wrong codes without mutation", async () => {
    expect((await verify(request({ ...payload, code: "999999" }))).status).toBe(400);
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it("accepts just before expiry and rejects at the boundary", async () => {
    const row = pending();
    f.find.mockResolvedValue(row);
    vi.setSystemTime(new Date(row.expiresAt.getTime() - 1));
    expect((await verify(request())).status).toBe(200);
    f.updateMany.mockClear();
    vi.setSystemTime(row.expiresAt);
    expect((await verify(request())).status).toBe(400);
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it("rechecks the bound apply draft before consumption", async () => {
    f.find.mockResolvedValue({ ...pending(), purpose: "apply", draftId: "draft-1" });
    f.draft.mockResolvedValue(null);
    expect((await verify(request())).status).toBe(400);
    expect(f.draft.mock.calls[0][0].where.id).toBe("draft-1");
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it("permits only one concurrent consumer and rejects replay", async () => {
    let claimed = false;
    f.updateMany.mockImplementation(async () => { if (claimed) return { count: 0 }; claimed = true; return { count: 1 }; });
    const responses = await Promise.all([verify(request()), verify(request())]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    expect(responses.filter(r => r.cookies.has(SESSION_COOKIE))).toHaveLength(1);
    expect((await verify(request())).status).toBe(400);
  });
  it("keeps payment provider failure separate from successful OTP", async () => {
    const result = await verifyOtp(request(), payload);
    expect(result.purpose).toBe("status");
    expect(f.provider).not.toHaveBeenCalled();
    await expect(createOrder({ verifiedIdentityHash: pending().inputIdentityHash, purpose: "status", draftId: null }, {
      purpose: "renewal", guestMonitoringId: "property", idempotencyKey: "test-key",
    })).rejects.toMatchObject({ status: 503 });
    expect(f.provider).toHaveBeenCalledOnce();
  });
});

describe("request gates and distributed limit contract", () => {
  it.each([12345, "12345", "1234567", "１２３４５６", "12345x", null])("rejects invalid code %j", async code => {
    const response = await verify(request({ ...payload, code }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "invalid_input" });
    expect(f.find).not.toHaveBeenCalled();
  });
  it.each([{ ...payload, injected: true }, { ...payload, verificationId: "../bad" }])("rejects extra fields or unsafe IDs", async body => {
    expect((await verify(request(body))).status).toBe(400);
    expect(f.find).not.toHaveBeenCalled();
  });
  it("turning OTP off blocks before reading a session", async () => {
    vi.stubEnv("GUEST_IDENTITY_MODE", "danal");
    expect((await verify(request())).status).toBe(404);
    expect(f.find).not.toHaveBeenCalled();
    expect(f.provider).not.toHaveBeenCalled();
  });
  it.each([["origin", "", 403], ["origin", "https://attacker.test", 403],
    ["content-length", "16385", 413]])("enforces request gate %s %s", async (key, value, status) => {
    for (const handler of [start, verify]) expect((await handler(request(payload, undefined, undefined, { [key]: value }))).status).toBe(status);
    expect(f.find).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.ip).not.toHaveBeenCalled();
  });
  it.each([["GUEST_MONITORING_ENABLED", "false", 404], ["PII_ENCRYPTION_KEY", "", 503]])("enforces env gate %s", async (key, value, status) => {
    vi.stubEnv(key, value);
    for (const handler of [start, verify]) expect((await handler(request())).status).toBe(status);
    expect(f.find).not.toHaveBeenCalled();
    expect(f.ip).not.toHaveBeenCalled();
  });
  it.each(["identity", "identity-phone", "identity-cost"])("blocks SMS at %s limit", async scope => {
    f.limit.mockImplementation(async name => { if (name === scope) throw new GuestError("rate_limited", 429, { "Retry-After": "60" }); });
    const response = await start(request(input));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(f.send).not.toHaveBeenCalled();
    if (scope === "identity-cost") {
      expect(f.create).toHaveBeenCalledOnce();
      expect(f.update).toHaveBeenCalledWith({ where: { id: payload.verificationId }, data: { revokedAt: new Date() } });
    } else expect(f.create).not.toHaveBeenCalled();
  });
  it("blocks SMS before parsing at the identity IP bound", async () => {
    f.ip.mockImplementation(async (_req, scope) => { if (scope === "identity") throw new GuestError("rate_limited", 429); });
    expect((await start(request(input))).status).toBe(429);
    expect(f.ip).toHaveBeenCalledWith(expect.anything(), "identity", 5, 600_000);
    expect(f.send).not.toHaveBeenCalled();
  });
  it.each(["otp-verify-id", "otp-verify-nonce"])("sixth attempt blocked by %s across IPs", async scope => {
    let attempts = 0;
    f.limit.mockImplementation(async name => { if (name === scope && ++attempts > 5) throw new GuestError("rate_limited", 429); });
    for (let i = 0; i < 5; i++) expect((await verify(request({ ...payload, code: "999999" }))).status).toBe(400);
    expect((await verify(request(payload, undefined, undefined, { "x-forwarded-for": "192.0.2.99" }))).status).toBe(429);
    expect(f.updateMany).not.toHaveBeenCalled();
    expect(f.limit).toHaveBeenCalledWith(scope, scope === "otp-verify-id" ? payload.verificationId : "nonce", 5, 600_000);
  });
  it.each([["", 100], ["0", 100], ["-1", 100], ["1.5", 100], ["Infinity", 100], ["invalid", 100], ["5000", 1000], ["17", 17]])("bounds daily cap %s", async (configured, cap) => {
    vi.stubEnv("GUEST_IDENTITY_DAILY_LIMIT", configured);
    expect((await start(request(input))).status).toBe(200);
    expect(f.limit).toHaveBeenCalledWith("identity-cost", "2026-10-15", cap, 86400_000);
    expect(f.limit).toHaveBeenCalledWith("identity-phone", input.guestPhone, 3, 600_000);
  });

  it.each(["sms_otp", "danal"])("invalid apply drafts do not consume daily budget in %s", async mode => {
    vi.stubEnv("GUEST_IDENTITY_MODE", mode);
    const providerStart = vi.fn();
    f.provider.mockReturnValue({ identity: { startVerification: providerStart } });
    f.draft.mockResolvedValue(null);
    const response = await start(request({ ...input, purpose: "apply", draftId: "draft-1", role: "owner" }));
    expect(response.status).toBe(404);
    expect(f.limit.mock.calls.map(call => call[0])).toEqual(["identity", "identity-phone"]);
    expect(f.create).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
    expect(providerStart).not.toHaveBeenCalled();
  });

  it.each(["sms_otp", "danal"])("missing apply draft in direct %s calls cannot use another draft or budget", async mode => {
    vi.stubEnv("GUEST_IDENTITY_MODE", mode);
    const providerStart = vi.fn();
    f.provider.mockReturnValue({ identity: { startVerification: providerStart } });
    await expect(startIdentity(request(), { ...input, purpose: "apply" })).rejects.toMatchObject({ status: 404 });
    expect(f.draft).not.toHaveBeenCalled();
    expect(f.limit).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
    expect(providerStart).not.toHaveBeenCalled();
  });

  it.each(["draft", "create"])("OTP %s persistence errors do not consume budget", async stage => {
    f.draft.mockResolvedValue({ id: "draft-1", role: "owner" });
    if (stage === "draft") f.draft.mockRejectedValue(new Error("database unavailable"));
    else f.create.mockRejectedValue(new Error("database unavailable"));
    const response = await start(request({ ...input, purpose: "apply", draftId: "draft-1", role: "owner" }));
    expect(response.status).toBe(500);
    expect(f.limit.mock.calls.map(call => call[0])).toEqual(["identity", "identity-phone"]);
    expect(f.send).not.toHaveBeenCalled();
  });

  it.each(["sms_otp", "danal"])("direct %s service calls enforce the cap before external calls", async mode => {
    vi.stubEnv("GUEST_IDENTITY_MODE", mode);
    const providerStart = vi.fn();
    f.provider.mockReturnValue({ identity: { startVerification: providerStart } });
    f.limit.mockRejectedValue(new GuestError("rate_limited", 429));
    await expect(startIdentity(request(), input)).rejects.toMatchObject({ status: 429 });
    expect(f.limit).toHaveBeenCalledOnce();
    expect(f.send).not.toHaveBeenCalled();
    expect(providerStart).not.toHaveBeenCalled();
  });

  it("reserves exactly once immediately before SMS and uses the current UTC date", async () => {
    f.create.mockImplementation(async () => {
      vi.setSystemTime(new Date("2026-10-16T00:00:00Z"));
      expect(f.limit.mock.calls.map(call => call[0])).toEqual(["identity", "identity-phone"]);
      return { id: payload.verificationId };
    });
    f.send.mockImplementation(async () => {
      expect(f.limit.mock.calls.at(-1)).toEqual(["identity-cost", "2026-10-16", 100, 86400_000]);
      return { success: true, channel: "sms" };
    });
    expect((await start(request(input))).status).toBe(200);
    expect(f.limit.mock.calls.filter(call => call[0] === "identity-cost")).toHaveLength(1);
  });

  it("Danal reserves exactly once after draft validation and before provider launch", async () => {
    vi.stubEnv("GUEST_IDENTITY_MODE", "danal");
    f.draft.mockImplementation(async () => {
      expect(f.limit.mock.calls.map(call => call[0])).toEqual(["identity", "identity-phone"]);
      return { id: "draft-1", role: "owner" };
    });
    const providerStart = vi.fn(async () => {
      expect(f.limit.mock.calls.at(-1)?.[0]).toBe("identity-cost");
      return { url: "https://provider.test/identity" };
    });
    f.provider.mockReturnValue({ identity: { startVerification: providerStart } });
    expect((await start(request({ ...input, purpose: "apply", draftId: "draft-1", role: "owner" }))).status).toBe(200);
    expect(f.limit.mock.calls.filter(call => call[0] === "identity-cost")).toHaveLength(1);
    expect(providerStart).toHaveBeenCalledOnce();
  });
});

describe("requireSession idle sliding and absolute cap (logout policy)", () => {
  const RAW = "verified-session-raw";
  const authReq = () => request({}, `${BROWSER_COOKIE}=browser; ${SESSION_COOKIE}=${RAW}`);
  function verified(over: Record<string, unknown> = {}) {
    const identity = guestIdentityHash(input.guestName, input.guestPhone);
    const now = Date.now();
    return { id: "sess-1", requestNonce: "nonce", purpose: "status", draftId: null,
      inputIdentityHash: identity, browserBindingHash: binding(request(), "browser"),
      providerTxId: "sms_otp_verified:x", tokenHash: digest(RAW),
      verifiedIdentityHash: identity, verifiedAt: new Date(now - 60_000), consumedAt: new Date(now - 60_000),
      revokedAt: null, expiresAt: new Date(now + 120_000), ...over };
  }
  it("slides expiresAt forward to now+10min on activity", async () => {
    f.find.mockResolvedValue(verified());
    const session = await requireSession(authReq());
    expect(session).toMatchObject({ id: "sess-1", purpose: "status" });
    expect(f.updateMany).toHaveBeenCalledTimes(1);
    const call = f.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ id: "sess-1", revokedAt: null });
    expect(call.data.expiresAt).toEqual(new Date(Date.now() + 600_000));
  });
  it("clamps the slide to verifiedAt + 60min absolute cap", async () => {
    const verifiedAt = new Date(Date.now() - 58 * 60_000);
    f.find.mockResolvedValue(verified({ verifiedAt, consumedAt: verifiedAt, expiresAt: new Date(Date.now() + 60_000) }));
    await requireSession(authReq());
    const call = f.updateMany.mock.calls[0][0];
    // now+10min(=now+600000)이 상한(verifiedAt+60min=now+120000)을 넘으므로 상한으로 clamp.
    expect(call.data.expiresAt).toEqual(new Date(verifiedAt.getTime() + 3_600_000));
  });
  it("does not write when next would not advance the current expiry", async () => {
    // 이미 유휴 최대치(now+10min)면 슬라이딩 불필요 → updateMany 미호출.
    f.find.mockResolvedValue(verified({ expiresAt: new Date(Date.now() + 600_000) }));
    await requireSession(authReq());
    expect(f.updateMany).not.toHaveBeenCalled();
  });
  it("rejects with 401 once past the (clamped) expiry — absolute logout enforced", async () => {
    f.find.mockResolvedValue(verified({ expiresAt: new Date(Date.now() - 1) }));
    await expect(requireSession(authReq())).rejects.toMatchObject({ code: "session_required", status: 401 });
    expect(f.updateMany).not.toHaveBeenCalled();
  });
});
