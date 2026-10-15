import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
vi.mock("@/lib/solapi-client", () => {
  const sendSms = vi.fn(async () => ({ channel: "sms_mock", success: true }));
  return { sendSms, prepareSms: vi.fn(async () => sendSms), findSmsReceipt: vi.fn(async () => null) };
});
vi.mock("@/lib/tilko-api", () => ({ isTilkoAvailable: () => false, fetchRegistryCaseStatus: vi.fn() }));
const url = process.env.GUEST_TEST_DATABASE_URL;
// Never run integration fixtures against an env.local / remote database.
if (url && (!/^postgresql:\/\/[^@]+@127\.0\.0\.1:55439\/vestra_guest_isolated$/.test(url))) {
  throw new Error("Integration tests require the dedicated loopback guest database");
}
const integration = describe.skipIf(!url);
integration("isolated PostgreSQL guest contract", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let raw: PrismaClient;
  let session: typeof import("../session");
  let orders: typeof import("../order");
  let activation: typeof import("../activation");
  let calendar: typeof import("../calendar-dto");
  let lifecycle: typeof import("../expiry");
  let sign: typeof import("@/lib/danal/callback").signMockCallback;
  let hash: typeof import("../identity-hash").guestIdentityHash;
  const name = "테스트";
  const phone = "01012345678";
  let identity: string;
  const request = (cookies = "") => new NextRequest("http://localhost:3000/api/guest-monitoring/test", {
    headers: { cookie: cookies, "user-agent": "guest-test-browser", origin: "http://localhost:3000" },
  });
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    vi.stubEnv("DIRECT_URL", url!);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("GUEST_MONITORING_ENABLED", "true");
    vi.stubEnv("PII_ENCRYPTION_KEY", "isolated-test-encryption-key-only");
    vi.stubEnv("PII_SALT", "isolated-test-salt");
    vi.stubEnv("SEARCH_INDEX_KEY", "isolated-test-search-key");
    vi.stubEnv("DANAL_PROVIDER", "mock");
    vi.stubEnv("DANAL_MOCK_SECRET", "isolated-test-signature-key-at-least-32-characters");
    vi.stubEnv("GUEST_MONITORING_MOCK_ISOLATED", "true");
    vi.stubEnv("RATE_LIMIT_BYPASS", "false");
    const { PrismaClient } = await import("@prisma/client");
    raw = new PrismaClient();
    const check = await raw.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
    expect(check[0].current_database).toBe("vestra_guest_isolated");
    prisma = (await import("@/lib/prisma")).prisma;
    session = await import("../session");
    orders = await import("../order");
    activation = await import("../activation");
    calendar = await import("../calendar-dto");
    lifecycle = await import("../expiry");
    sign = (await import("@/lib/danal/callback")).signMockCallback;
    hash = (await import("../identity-hash")).guestIdentityHash;
    identity = hash(name, phone);
    await prisma.guestMonitoring.deleteMany();
    await prisma.guestVerificationSession.deleteMany();
    await prisma.rateLimit.deleteMany();
  });
  afterAll(async () => { await prisma?.$disconnect(); await raw?.$disconnect(); vi.unstubAllEnvs(); });
  async function draft(offset = 0) {
    return prisma.guestMonitoring.create({ data: {
      guestName: name, guestPhone: phone, guestIdentityHash: identity, address: "서울 중구 테스트로 1",
      ownerName: name, commUniqueNo: `1234-1234-${String(offset).padStart(6, "0")}`,
      draftExpiresAt: new Date(Date.now() + 1800_000),
    } });
  }
  const principal = (draftId: string) => ({ verifiedIdentityHash: identity, purpose: "apply", draftId });
  async function approved(orderId: string, amount = 10000) {
    return sign("payment", { orderId, transactionId: `tx_${randomUUID()}`, merchantId: "guest-isolated-mock",
      amount, currency: "KRW", status: "paid", paidAt: Date.now(), expiresAt: Date.now() + 600_000 });
  }
  it("stores ciphertext, preserves blind index, and returns no raw PII in order DTO", async () => {
    const d = await draft(1);
    const stored = await raw.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    expect(stored.guestName).toMatch(/^v2:/);
    expect(stored.guestPhone).toMatch(/^v2:/);
    expect(stored.ownerName).toMatch(/^v2:/);
    expect(stored.address).toMatch(/^v2:/);
    expect(stored.guestIdentityHash).toBe(identity);
    expect(d.guestName).toBe(name);
    const result = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    expect(result.data).toMatchObject({ amount: 10000, currency: "KRW", status: "pending" });
    expect(JSON.stringify(result.data)).not.toContain(phone);
  });
  it("binds identity callback to browser and nonce, consumes once, revokes logout", async () => {
    const d = await draft(2);
    const started = await session.startIdentity(request(), { purpose: "apply", guestName: name, guestPhone: phone, draftId: d.id });
    const signed = sign("identity", { nonce: started.data.launch.state, transactionId: "identity-tx-2", guestName: name,
      guestPhone: phone, approved: true, expiresAt: Date.now() + 600_000 });
    await expect(session.consumeIdentity(request(), signed)).rejects.toThrow();
    const browserCookie = `${session.BROWSER_COOKIE}=${started.browser}`;
    const consumed = await session.consumeIdentity(request(browserCookie), signed);
    await expect(session.consumeIdentity(request(browserCookie), signed)).rejects.toThrow();
    const authRequest = request(`${browserCookie}; ${session.SESSION_COOKIE}=${consumed.rawToken}`);
    const verified = await session.requireSession(authRequest);
    expect(verified.verifiedIdentityHash).toBe(identity);
    expect(verified.draftId).toBe(d.id);
    await expect(session.requireSession(authRequest, ["status", "renewal"])).rejects.toMatchObject({ status: 404 });
    const { NextResponse } = await import("next/server");
    await session.revokeSession(authRequest, NextResponse.json({ ok: true }));
    await expect(session.requireSession(authRequest)).rejects.toMatchObject({ status: 401 });
  });
  it("rejects mismatched verified identity and expired authentication", async () => {
    const started = await session.startIdentity(request(), { purpose: "status", guestName: name, guestPhone: phone });
    const req = request(`${session.BROWSER_COOKIE}=${started.browser}`);
    const signed = sign("identity", { nonce: started.data.launch.state, transactionId: "identity-mismatch", guestName: "다른사람",
      guestPhone: phone, approved: true, expiresAt: Date.now() + 600_000 });
    await expect(session.consumeIdentity(req, signed)).rejects.toThrow();
    await prisma.guestVerificationSession.update({ where: { id: started.data.verificationId }, data: { expiresAt: new Date(0) } });
    const expired = sign("identity", { nonce: started.data.launch.state, transactionId: "identity-expired", guestName: name,
      guestPhone: phone, approved: true, expiresAt: Date.now() + 600_000 });
    await expect(session.consumeIdentity(req, expired)).rejects.toThrow();
  });
  it("serializes order creation, callback replay, and repeated activation", async () => {
    const d = await draft(3);
    const input = { purpose: "initial" as const, draftId: d.id, idempotencyKey: randomUUID() };
    const created = await Promise.all([orders.createOrder(principal(d.id), input), orders.createOrder(principal(d.id), input)]);
    expect(created[0].data.orderId).toBe(created[1].data.orderId);
    const otherKey = await orders.createOrder(principal(d.id), { ...input, idempotencyKey: randomUUID() });
    expect(otherKey.data.orderId).toBe(created[0].data.orderId);
    const receipt = await approved(created[0].data.orderId);
    await Promise.all([activation.paymentCallback(receipt), activation.paymentCallback(receipt)]);
    const before = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    await activation.paymentCallback(receipt);
    const payload = JSON.parse(Buffer.from(receipt.payload, "base64url").toString());
    const retransmitted = sign("payment", { ...payload, expiresAt: payload.expiresAt + 1000 });
    await activation.paymentCallback(retransmitted);
    const after = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    expect(before.paidUntil).toEqual(after.paidUntil);
    expect(after.status).toBe("active");
    expect(await prisma.guestMonitoringOrder.count({ where: { guestMonitoringId: d.id } })).toBe(1);
    const state = await orders.getOrder(identity, created[0].data.orderId);
    expect(state.applied).toBe(true);
    await expect(orders.getOrder("wrong-identity", created[0].data.orderId)).rejects.toMatchObject({ status: 404, code: "not_found" });
    await expect(orders.getOrder(identity, "missing-order")).rejects.toMatchObject({ status: 404, code: "not_found" });
  });
  it("blocks amount mismatch and rejects fake success", async () => {
    const d = await draft(4);
    const created = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    await activation.paymentCallback(await approved(created.data.orderId, 1));
    expect((await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } })).status).toBe("pending_payment");
    expect((await orders.getOrder(identity, created.data.orderId)).status).toBe("failed");
    await expect(activation.paymentCallback({ orderId: created.data.orderId, success: true })).rejects.toThrow();
  });
  it("recovers a verified paid order that was not applied", async () => {
    const d = await draft(5);
    const created = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    const provider = (await import("@/lib/danal")).getDanalProvider();
    const payment = await provider.payment.verifyPayment(await approved(created.data.orderId));
    await activation.recordPayment(await provider.payment.getPayment(payment.verificationReference || payment.transactionId));
    expect((await orders.getOrder(identity, created.data.orderId)).applied).toBe(false);
    expect((await lifecycle.runGuestLifecycle()).recovered).toBe(1);
    expect((await orders.getOrder(identity, created.data.orderId)).applied).toBe(true);
  });
  it("extends only an owned property and applies a month once", async () => {
    const d = await draft(6);
    const created = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    await activation.paymentCallback(await approved(created.data.orderId));
    const before = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    const principalStatus = { purpose: "status", draftId: null, verifiedIdentityHash: identity };
    const input = { purpose: "renewal" as const, guestMonitoringId: d.id, idempotencyKey: randomUUID() };
    await expect(orders.createOrder({ ...principalStatus, verifiedIdentityHash: "wrong" }, input)).rejects.toMatchObject({ status: 404 });
    const renewal = await orders.createOrder(principalStatus, input);
    const receipt = await approved(renewal.data.orderId);
    await Promise.all([activation.paymentCallback(receipt), activation.paymentCallback(receipt)]);
    const { addKstMonth } = await import("../period");
    const after = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    expect(after.paidUntil).toEqual(addKstMonth(before.paidUntil!));
  });
  it("returns empty calendar and blocks cross-identity reads with identical 404", async () => {
    const properties = await calendar.listProperties(identity);
    expect(properties.properties.length).toBeGreaterThan(0);
    expect(Object.keys(properties.properties[0]).sort()).toEqual(["addressShort", "id", "paidUntil", "startedAt", "status"]);
    const { kstMonth } = await import("../period");
    const p = properties.properties[0];
    const result = await calendar.getCalendar(identity, p.id, kstMonth());
    expect(result.logs).toEqual([]);
    await expect(calendar.getCalendar("wrong", p.id, kstMonth())).rejects.toMatchObject({ status: 404, code: "not_found" });
    await expect(calendar.getCalendar(identity, "missing", kstMonth())).rejects.toMatchObject({ status: 404, code: "not_found" });
    expect(await calendar.listProperties("wrong")).toEqual({ properties: [] });
  });
  it("records missing Tilko as fetch_failed and never monitors expired properties", async () => {
    const d = await draft(7);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: {
      status: "active", startedAt: new Date(), paidUntil: new Date(Date.now() + 86400_000),
    } });
    const expired = await draft(8);
    await prisma.guestMonitoring.update({ where: { id: expired.id }, data: { status: "active", startedAt: new Date(0), paidUntil: new Date(1) } });
    const { runGuestPrechecks } = await import("../precheck-adapter");
    await runGuestPrechecks();
    const log = await prisma.guestMonitoringCheckLog.findFirstOrThrow({ where: { guestMonitoringId: d.id } });
    expect(log.result).toBe("fetch_failed");
    expect(await prisma.guestMonitoringCheckLog.count({ where: { guestMonitoringId: expired.id } })).toBe(0);
    await runGuestPrechecks();
    expect(await prisma.guestMonitoringCheckLog.count({ where: { guestMonitoringId: d.id } })).toBe(1);
  });
  it("expires once, sends one period notice and scrubs abandoned draft PII", async () => {
    const abandoned = await draft(9);
    await prisma.guestMonitoring.update({ where: { id: abandoned.id }, data: { draftExpiresAt: new Date(0) } });
    const first = await lifecycle.runGuestLifecycle();
    expect(first.expired).toBe(1);
    expect(first.sent).toBe(1);
    const expired = await prisma.guestMonitoring.findFirstOrThrow({ where: { commUniqueNo: "1234-1234-000008" } });
    await lifecycle.runGuestLifecycle();
    expect(await prisma.guestMonitoringMessage.count({ where: { guestMonitoringId: expired.id } })).toBe(1);
    const scrubbed = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: abandoned.id } });
    expect(scrubbed.status).toBe("abandoned");
    expect(scrubbed.guestName).toBe("삭제됨");
    expect(scrubbed.ownerName).toBe(null);
  });
  it("does not send a stale expiry notice after a renewal wins the identity lock", async () => {
    const { locked } = await import("../transaction");
    const { deliverOutbox } = await import("../outbox");
    const { sendSms } = await import("@/lib/solapi-client");
    const d = await draft(10);
    const expiredAt = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil: expiredAt } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id,
      targetPaidUntil: expiredAt, type: "expiry_notice" } });
    let acquired!: () => void;
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const renewal = locked(identity, async tx => {
      acquired();
      await barrier;
      await tx.guestMonitoring.update({ where: { id: d.id }, data: { status: "active", paidUntil: new Date(Date.now() + 86400_000) } });
    });
    await ready;
    const callsBefore = vi.mocked(sendSms).mock.calls.length;
    const sending = deliverOutbox(new Date());
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const state = await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } });
        if (state.status === "preparing") break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } finally { release(); }
    await renewal;
    await sending;
    expect(vi.mocked(sendSms).mock.calls.length).toBe(callsBefore);
  });
  it("serializes two independently paid renewals without losing a month", async () => {
    const d = await draft(11);
    const initial = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    await activation.paymentCallback(await approved(initial.data.orderId));
    const before = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    const copies = await Promise.all([1, 2].map(async () => prisma.guestMonitoringOrder.create({ data: {
      guestMonitoringId: d.id, orderId: `ord_${randomUUID()}`, purpose: "renewal", amount: 10000, currency: "KRW",
      productVersion: "2026-10-15", providerMode: "mock", idempotencyKey: randomUUID(),
      status: "paid", paidAt: new Date(), providerTransactionId: `tx_${randomUUID()}`,
      expiresAt: new Date(Date.now() + 600_000),
    } })));
    await Promise.all(copies.map(order => activation.applyPaidOrder(order.orderId)));
    const { addKstMonth } = await import("../period");
    const after = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } });
    expect(after.paidUntil).toEqual(addKstMonth(addKstMonth(before.paidUntil!)));
  });
  let documentSerial = 20;
  it.each([
    { currency: "USD" }, { merchantId: "wrong-merchant" }, { status: "canceled" }, { paidAt: Date.now() + 86400_000 },
  ])("rejects an invalid verified payment: %j", async patch => {
    const d = await draft(documentSerial++);
    const created = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    const envelope = await approved(created.data.orderId);
    const payload = JSON.parse(Buffer.from(envelope.payload, "base64url").toString());
    await activation.paymentCallback(sign("payment", { ...payload, ...patch }));
    expect((await orders.getOrder(identity, created.data.orderId)).applied).toBe(false);
    expect((await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } })).status).toBe("pending_payment");
  });

  it("reconciles a lost SMS response using the provider receipt without resending", async () => {
    const { deliverOutbox } = await import("../outbox");
    const { sendSms, findSmsReceipt } = await import("@/lib/solapi-client");
    const d = await draft(30);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id,
      targetPaidUntil: paidUntil, type: "expiry_notice" } });
    vi.mocked(sendSms).mockResolvedValueOnce({ channel: "sms", success: false, retryable: false });
    await deliverOutbox(new Date());
    const before = vi.mocked(sendSms).mock.calls.length;
    vi.mocked(findSmsReceipt).mockResolvedValueOnce("reconciled-provider-receipt");
    await deliverOutbox(new Date(Date.now() + 11 * 60_000));
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before);
    const result = await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } });
    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toBe("reconciled-provider-receipt");
  });
  it("retries confirmed SMS non-acceptance only up to the configured limit", async () => {
    const { deliverOutbox } = await import("../outbox");
    const { sendSms } = await import("@/lib/solapi-client");
    const d = await draft(31);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id,
      targetPaidUntil: paidUntil, type: "expiry_notice" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        vi.mocked(sendSms).mockResolvedValueOnce({ channel: "sms", success: false, retryable: true });
        await deliverOutbox(new Date(Date.now() + attempt * 11 * 60_000));
      }
      const result = await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } });
      expect(result.status).toBe("dead");
      expect(result.attempts).toBe(3);
      expect(result.nextAttemptAt).toBeNull();
    } finally { log.mockRestore(); }
  });

  it.each(["active_property", "applied_initial"])("queues a paid initial conflict for manual resolution: %s", async conflict => {
    const d = await draft(documentSerial++);
    const created = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    if (conflict === "active_property") {
      const duplicate = await draft(documentSerial++);
      await prisma.guestMonitoring.update({ where: { id: duplicate.id }, data: {
        commUniqueNo: d.commUniqueNo, status: "active", startedAt: new Date(), paidUntil: new Date(Date.now() + 86400_000),
      } });
    } else {
      await prisma.guestMonitoringOrder.create({ data: {
        guestMonitoringId: d.id, orderId: `ord_${randomUUID()}`, purpose: "initial", amount: 10000,
        productVersion: "test", providerMode: "mock", idempotencyKey: randomUUID(), status: "paid",
        providerTransactionId: `tx_${randomUUID()}`, appliedAt: new Date(), expiresAt: new Date(),
      } });
    }
    const receipt = await approved(created.data.orderId);
    await expect(activation.paymentCallback(receipt)).rejects.toMatchObject({ code: "payment_needs_review" });
    await expect(activation.paymentCallback(receipt)).rejects.toMatchObject({ code: "payment_needs_review" });
    expect(await orders.getOrder(identity, created.data.orderId)).toMatchObject({ status: "needs_review", applied: false });
    expect(await prisma.auditLog.count({ where: { action: "GUEST_PAYMENT_NEEDS_REVIEW", target: created.data.orderId } })).toBe(1);
    const { recoverPayments } = await import("../recovery");
    expect(await recoverPayments()).toBe(0);
    const reused = await orders.createOrder(principal(d.id), { purpose: "initial", draftId: d.id, idempotencyKey: randomUUID() });
    expect(reused.data).toMatchObject({ orderId: created.data.orderId, status: "needs_review", payment: {} });
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { draftExpiresAt: new Date(0) } });
    const { cleanupGuestData } = await import("../cleanup");
    await cleanupGuestData(new Date());
    expect((await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: d.id } })).guestName).toBe(name);
  });

  it("retries failed SMS preparation without entering receipt-only recovery", async () => {
    const { deliverOutbox } = await import("../outbox");
    const { prepareSms, sendSms, findSmsReceipt } = await import("@/lib/solapi-client");
    const d = await draft(documentSerial++);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id, targetPaidUntil: paidUntil, type: "expiry_notice" } });
    const before = vi.mocked(sendSms).mock.calls.length;
    const queries = vi.mocked(findSmsReceipt).mock.calls.length;
    vi.mocked(prepareSms).mockRejectedValueOnce(new Error("settings unavailable"));
    await deliverOutbox(new Date());
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before);
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "preparing", attempts: 1 });
    await deliverOutbox(new Date(Date.now() + 11 * 60_000));
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before + 1);
    expect(vi.mocked(findSmsReceipt).mock.calls.length).toBe(queries);
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("recovers a crashed preparation lease and claims concurrent runs only once", async () => {
    const { deliverOutbox } = await import("../outbox");
    const { sendSms } = await import("@/lib/solapi-client");
    const d = await draft(documentSerial++);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id, targetPaidUntil: paidUntil,
      type: "expiry_notice", status: "preparing", attempts: 1, nextAttemptAt: new Date(0) } });
    const before = vi.mocked(sendSms).mock.calls.length;
    const results = await Promise.all([deliverOutbox(new Date()), deliverOutbox(new Date())]);
    expect(results.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before + 1);
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("bounds concurrent requests for a new rate-limit key without unique-key races", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = `guest-review:${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 25 }, () => rateLimit(key, 20)));
    expect(results.filter(result => result.success)).toHaveLength(20);
    expect(results.filter(result => !result.success)).toHaveLength(5);
    expect(await prisma.rateLimit.findUniqueOrThrow({ where: { id: key } })).toMatchObject({ count: 25 });
  });

  it("keeps the send marker through transaction rollback and reconciles without a second send", async () => {
    const { deliverOutbox } = await import("../outbox");
    const transaction = await import("../transaction");
    const { sendSms, findSmsReceipt } = await import("@/lib/solapi-client");
    const d = await draft(documentSerial++);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id, targetPaidUntil: paidUntil, type: "expiry_notice" } });
    const original = transaction.locked;
    const fail = vi.spyOn(transaction, "locked").mockImplementationOnce((identity, run, retries) => original(identity, async tx => {
      await run(tx);
      throw new Error("simulated transaction rollback after external send");
    }, retries));
    try {
      expect(await deliverOutbox(new Date())).toBe(0);
    } finally { fail.mockRestore(); }
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "dead", attempts: 1 });
    const before = vi.mocked(sendSms).mock.calls.length;
    vi.mocked(findSmsReceipt).mockResolvedValueOnce("receipt-after-rollback");
    expect(await deliverOutbox(new Date(Date.now() + 11 * 60_000))).toBe(1);
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before);
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "sent", providerMessageId: "receipt-after-rollback" });
  });

  it("stops persistent preparation failures and records a visible manual queue item", async () => {
    const { deliverOutbox } = await import("../outbox");
    const { prepareSms, sendSms } = await import("@/lib/solapi-client");
    const d = await draft(documentSerial++);
    const paidUntil = new Date(Date.now() - 1000);
    await prisma.guestMonitoring.update({ where: { id: d.id }, data: { status: "expired", startedAt: new Date(0), paidUntil } });
    const message = await prisma.guestMonitoringMessage.create({ data: { guestMonitoringId: d.id, targetPaidUntil: paidUntil, type: "expiry_notice" } });
    const before = vi.mocked(sendSms).mock.calls.length;
    for (let attempt = 0; attempt < 3; attempt++) {
      vi.mocked(prepareSms).mockRejectedValueOnce(new Error("settings unavailable"));
      await deliverOutbox(new Date(Date.now() + attempt * 11 * 60_000));
    }
    expect(await prisma.guestMonitoringMessage.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ status: "dead", attempts: 3, nextAttemptAt: null });
    expect(await prisma.auditLog.count({ where: { action: "GUEST_SMS_NEEDS_REVIEW", target: message.id } })).toBe(1);
    await deliverOutbox(new Date(Date.now() + 44 * 60_000));
    expect(vi.mocked(sendSms).mock.calls.length).toBe(before);
  });

});
