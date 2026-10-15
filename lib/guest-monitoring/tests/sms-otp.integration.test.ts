import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/solapi-client", () => ({ sendSms: vi.fn(async () => ({ success: true, channel: "sms" })) }));

const url = process.env.GUEST_TEST_DATABASE_URL;
if (url && !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55439\/vestra_guest_isolated$/.test(url)) {
  throw new Error("Integration tests require the dedicated loopback guest database");
}
describe.skipIf(!url)("OTP isolated PostgreSQL persistence", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let otp: typeof import("../sms-otp");
  let session: typeof import("../session");
  const ids: string[] = [];
  const browsers: string[] = [];
  const input = { purpose: "status" as const, guestName: "테스트", guestPhone: "01012345678" };
  function request(browser: string = randomUUID(), raw?: string) {
    browsers.push(browser);
    return new NextRequest("http://localhost:3000/api/guest-monitoring/identity/test", {
      headers: { cookie: `guest_monitoring_browser=${browser}${raw ? `; guest_monitoring_session=${raw}` : ""}`,
        "user-agent": "isolated-OTP-test" },
    });
  }
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    vi.stubEnv("DIRECT_URL", url!);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("GUEST_IDENTITY_MODE", "sms_otp");
    vi.stubEnv("GUEST_MONITORING_ENABLED", "true");
    vi.stubEnv("PII_ENCRYPTION_KEY", "isolated-test-encryption-key-only");
    vi.stubEnv("PII_SALT", "isolated-test-salt");
    vi.stubEnv("SEARCH_INDEX_KEY", "isolated-test-search-key");
    vi.stubEnv("RATE_LIMIT_BYPASS", "false");
    prisma = (await import("@/lib/prisma")).prisma;
    const result = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
    expect(result[0].current_database).toBe("vestra_guest_isolated");
    otp = await import("../sms-otp");
    session = await import("../session");
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.guestVerificationSession.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    vi.unstubAllEnvs();
  });
  async function start(req: NextRequest) {
    const result = await otp.startOtp(req, input);
    ids.push(result.data.verificationId);
    const { sendSms } = await import("@/lib/solapi-client");
    const message = vi.mocked(sendSms).mock.calls.at(-1)![1];
    const code = message.match(/\[(\d{6})\]/)![1];
    return { verificationId: result.data.verificationId, code };
  }
  it("stores only the digest, allows one racing consumer and supports the verified session", async () => {
    const req = request();
    const verification = await start(req);
    const stored = await prisma.guestVerificationSession.findUniqueOrThrow({ where: { id: verification.verificationId } });
    expect(stored.providerTxId).toMatch(/^otp:[a-f0-9]{64}$/);
    expect(stored.providerTxId).toBe(`otp:${otp.otpDigest({ nonce: stored.requestNonce,
      inputIdentityHash: stored.inputIdentityHash, code: verification.code })}`);
    const results = await Promise.allSettled([otp.verifyOtp(req, verification), otp.verifyOtp(req, verification)]);
    const successes = results.filter(r => r.status === "fulfilled");
    expect(successes).toHaveLength(1);
    const row = await prisma.guestVerificationSession.findUniqueOrThrow({ where: { id: stored.id } });
    expect(row.providerTxId).toMatch(/^sms_otp_verified:/);
    expect(row.verifiedIdentityHash).toBe(stored.inputIdentityHash);
    expect(row.consumedAt).not.toBeNull();
    const raw = successes[0].value.rawToken;
    expect(await session.requireSession(request(browsers[0], raw))).toMatchObject({ id: stored.id });
    await expect(otp.verifyOtp(req, verification)).rejects.toMatchObject({ code: "verification_failed" });
  });
  it("revokes a previous pending code on resend", async () => {
    const req = request();
    const first = await start(req);
    const next = await start(req);
    expect(first.verificationId).not.toBe(next.verificationId);
    const previous = await prisma.guestVerificationSession.findUniqueOrThrow({ where: { id: first.verificationId } });
    expect(previous.revokedAt).not.toBeNull();
    await expect(otp.verifyOtp(req, first)).rejects.toMatchObject({ code: "verification_failed" });
    expect((await otp.verifyOtp(req, next)).purpose).toBe("status");
  });
  it("persists revocation on a failed external send", async () => {
    const { sendSms } = await import("@/lib/solapi-client");
    vi.mocked(sendSms).mockResolvedValueOnce({ success: false, channel: "sms" });
    const req = request();
    await expect(otp.startOtp(req, input)).rejects.toMatchObject({ status: 503 });
    const { binding } = await import("../session-binding");
    const row = await prisma.guestVerificationSession.findFirstOrThrow({ where: {
      browserBindingHash: binding(req, browsers.at(-1)!),
    } });
    ids.push(row.id);
    expect(row.revokedAt).not.toBeNull();
    expect(row.verifiedAt).toBeNull();
  });
});
