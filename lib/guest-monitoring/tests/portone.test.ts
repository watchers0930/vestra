import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  findUnique: vi.fn(), updateMany: vi.fn(), audit: vi.fn(),
  channels: [] as { storeId: string; channelKey: string; payMethod: string; pgProvider: string; evidence: string }[],
}));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: { findUnique: fixture.findUnique, updateMany: fixture.updateMany }, auditLog: { create: fixture.audit } } }));
vi.mock("@/lib/danal/portone-test-channels", () => ({ verifiedTestChannels: fixture.channels }));
import { getDanalProvider } from "@/lib/danal";
import { getPortoneConfig, resolvePaymentMode } from "@/lib/danal/portone-config";
import { portoneProvider } from "@/lib/danal/portone";
import { getPaymentById, PortonePaymentNotFound } from "@/lib/danal/portone-rest";
import { encodeReceipt, newReceipt, parseReceipt, signCallbackContext, verifyCallbackContext } from "@/lib/danal/portone-callback";
import { PortoneTerminalPayment } from "@/lib/danal/portone-payment";
const config = { storeId: "store-fixture", channelKey: "channel-fixture", payMethod: "CARD", pgProvider: "DANAL", evidence: "isolated unit fixture; no real channel" };
let order: ReturnType<typeof makeOrder>;
const fetchMock = vi.fn();
function makeOrder() {
  return { id: "row", orderId: "ord_fixture", amount: 10000, currency: "KRW", providerMode: "portone",
    createdAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000),
    providerReceipt: newReceipt() as string | null, providerTransactionId: null as string | null,
    appliedAt: null as Date | null, status: "pending" };
}
function payment(extra: Record<string, unknown> = {}) {
  return { id: order.orderId, storeId: config.storeId, status: "PAID", transactionId: "tx_fixture",
    amount: { total: 10000 }, currency: "KRW", paidAt: new Date(Date.now() - 1000).toISOString(),
    channel: { key: config.channelKey, type: "TEST", pgProvider: "DANAL" }, ...extra };
}
async function launch() { return portoneProvider.payment.createPayment(order); }
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GUEST_PAYMENT_MODE", "portone"); vi.stubEnv("DANAL_PROVIDER", "");
  vi.stubEnv("NEXT_PUBLIC_PORTONE_STORE_ID", config.storeId);
  vi.stubEnv("NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL", config.channelKey);
  vi.stubEnv("PORTONE_V2_API_SECRET", "server-secret-fixture");
  vi.stubEnv("SEARCH_INDEX_KEY", "signing-secret-fixture");
  vi.stubEnv("AUTH_SECRET", "");
  fixture.channels.splice(0, fixture.channels.length, config);
  order = makeOrder();
  fixture.findUnique.mockImplementation(async ({ where }) => where.orderId === order.orderId ||
    (order.providerTransactionId && where.providerTransactionId === order.providerTransactionId) ? { ...order } : null);
  fixture.updateMany.mockImplementation(async ({ where, data }) => {
    if (order.providerReceipt !== where.providerReceipt) return { count: 0 };
    Object.assign(order, data); return { count: 1 };
  });
  fetchMock.mockImplementation(async () => response(payment()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("mode/config guards", () => {
  it.each([["", "", null], ["typo", "", null], ["portone", "mock", null], ["mock", "portone", null],
    ["portone", "", "portone"], ["", "portone", "portone"], [" mock ", " mock ", "mock"]])("resolves explicit modes %s / %s", (pay, dan, expected) => {
    vi.stubEnv("GUEST_PAYMENT_MODE", pay!); vi.stubEnv("DANAL_PROVIDER", dan!);
    if (expected) expect(resolvePaymentMode()).toBe(expected);
    else expect(resolvePaymentMode).toThrowError(expect.objectContaining({ code: "provider_unavailable", status: 503 }));
  });
  it.each(["NEXT_PUBLIC_PORTONE_STORE_ID", "NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL", "PORTONE_V2_API_SECRET", "SEARCH_INDEX_KEY"])("rejects missing %s", name => {
    vi.stubEnv(name, ""); expect(getPortoneConfig).toThrowError(expect.objectContaining({ status: 503 }));
  });
  it("blocks unreviewed channels even with keys configured", () => {
    fixture.channels.splice(0); expect(getDanalProvider).toThrowError(expect.objectContaining({ status: 503 }));
  });
  it("keeps mock isolated and independent of legacy selector when new mode alone is set", () => {
    vi.stubEnv("GUEST_PAYMENT_MODE", "mock"); vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/guest_test");
    vi.stubEnv("GUEST_MONITORING_MOCK_ISOLATED", "true"); vi.stubEnv("DANAL_MOCK_SECRET", "x".repeat(32));
    expect(getDanalProvider().mode).toBe("mock");
    vi.stubEnv("NODE_ENV", "production"); expect(getDanalProvider).toThrow();
  });
  it("blocks the PortOne identity API", async () => {
    await expect(portoneProvider.identity.startVerification({ nonce: "n", expiresAt: new Date() })).rejects.toMatchObject({ status: 503 });
    await expect(portoneProvider.identity.verifyResult({})).rejects.toMatchObject({ status: 503 });
  });
});
describe("signed context and receipt", () => {
  it("returns exactly the payment contract without secrets, and preserves nonce on resumes", async () => {
    const first = await launch(); expect(await launch()).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(["provider", "storeId", "channelKey", "paymentId", "orderName", "totalAmount", "currency", "payMethod", "expiresAt", "callbackContext", "callbackSignature"].sort());
    expect(first).toMatchObject({ paymentId: order.orderId, totalAmount: "10000", currency: "KRW", orderName: "등기감시 1개월" });
    expect(JSON.stringify(first)).not.toContain("server-secret-fixture");
    const context = verifyCallbackContext({ paymentId: first.paymentId, callbackContext: first.callbackContext, callbackSignature: first.callbackSignature });
    expect(context.nonce).toBe(parseReceipt(order.providerReceipt).nonce);
  });
  it("creates one stable receipt for simultaneous first launches", async () => {
    order.providerReceipt = null;
    const [a, b] = await Promise.all([launch(), launch()]); expect(a).toEqual(b);
    expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
  });
  it("rejects malformed and forged signatures before any REST work", async () => {
    const info = await launch();
    for (const extra of [{ callbackSignature: "00".repeat(32) }, { callbackSignature: "a" }, { paymentId: "other" }, { callbackContext: "bad==" }, { extra: true }]) {
      const body = { paymentId: info.paymentId, callbackContext: info.callbackContext, callbackSignature: info.callbackSignature, ...extra };
      await expect(portoneProvider.payment.verifyPayment(body)).rejects.toMatchObject({ code: "payment_failed" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["nonce", "amount", "currency", "storeId", "expiresAt"])("rejects changed %s binding", async field => {
    const info = await launch();
    const original = verifyCallbackContext({ paymentId: info.paymentId, callbackContext: info.callbackContext, callbackSignature: info.callbackSignature });
    const value = field === "nonce" ? parseReceipt(newReceipt()).nonce : field === "amount" ? 9999 : field === "expiresAt" ? original.expiresAt + 1 : "wrong";
    if (field === "currency") { order.currency = "USD"; }
    const signed = field === "currency" ? info : signCallbackContext({ ...original, [field]: value });
    await expect(portoneProvider.payment.verifyPayment({ paymentId: info.paymentId, callbackContext: signed.callbackContext, callbackSignature: signed.callbackSignature })).rejects.toMatchObject({ code: "payment_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects expired unconsumed context, but permits a recorded replay for recovery", async () => {
    const info = await launch();
    vi.useFakeTimers(); vi.setSystemTime(order.expiresAt.getTime() + 1);
    const body = { paymentId: info.paymentId, callbackContext: info.callbackContext, callbackSignature: info.callbackSignature };
    await expect(portoneProvider.payment.verifyPayment(body)).rejects.toMatchObject({ code: "payment_failed" });
    order.providerTransactionId = "tx_fixture"; order.status = "paid";
    order.providerReceipt = encodeReceipt({ ...parseReceipt(order.providerReceipt), consumed: true });
    fetchMock.mockResolvedValue(response(payment({ paidAt: new Date(order.createdAt.getTime() + 1000).toISOString() })));
    await expect(portoneProvider.payment.verifyPayment(body)).resolves.toMatchObject({ transactionId: "tx_fixture" });
  });
});
describe("REST mapping and availability", () => {
  it("requeries using paymentId even when cron passes transactionId", async () => {
    order.providerTransactionId = "tx_fixture";
    await expect(portoneProvider.payment.getPayment("tx_fixture")).resolves.toMatchObject({ verificationReference: order.orderId, transactionId: "tx_fixture" });
    expect(fetchMock.mock.calls[0][0]).toContain(`/payments/${order.orderId}?storeId=`);
    expect(fetchMock.mock.calls[0][0]).not.toContain("/payments/tx_fixture");
  });
  it("uses fixed host, encoded path, server Authorization, no cache and no redirects", async () => {
    await getPaymentById("a/b?c");
    expect(fetchMock).toHaveBeenCalledWith("https://api.portone.io/payments/a%2Fb%3Fc?storeId=store-fixture", expect.objectContaining({ cache: "no-store", redirect: "error", headers: { Authorization: "PortOne server-secret-fixture" } }));
  });
  it.each([401, 403, 429, 500, 502])("maps REST %s to sanitized availability error", async status => {
    fetchMock.mockResolvedValue(response({ secret: "do-not-expose" }, status));
    await expect(getPaymentById(order.orderId)).rejects.toMatchObject({ code: "provider_unavailable", status: 503, message: "provider_unavailable" });
  });
  it("keeps provider 404 distinct but exposes a retryable, sanitized error", async () => {
    fetchMock.mockResolvedValue(response({ secret: "do-not-expose" }, 404));
    await expect(getPaymentById(order.orderId)).rejects.toBeInstanceOf(PortonePaymentNotFound);
    await expect(getPaymentById(order.orderId)).rejects.toMatchObject({
      code: "provider_unavailable", status: 503, message: "provider_unavailable",
    });
  });
  it("can retry the same signed context after provider 404 without consuming nonce", async () => {
    const info = await launch();
    const body = { paymentId: info.paymentId, callbackContext: info.callbackContext, callbackSignature: info.callbackSignature };
    fetchMock.mockResolvedValueOnce(response({}, 404));
    await expect(portoneProvider.payment.verifyPayment(body)).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
    expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
    await expect(portoneProvider.payment.verifyPayment(body)).resolves.toMatchObject({ status: "paid", orderId: order.orderId });
    expect(fixture.updateMany).not.toHaveBeenCalled();
  });
  it("does not query cross-order transaction ownership while mapping REST snapshots", async () => {
    const info = await launch();
    fixture.findUnique.mockClear();
    await portoneProvider.payment.verifyPayment({ paymentId: info.paymentId, callbackContext: info.callbackContext, callbackSignature: info.callbackSignature });
    await portoneProvider.payment.getPayment(order.orderId);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fixture.findUnique).toHaveBeenCalledTimes(2);
    expect(fixture.findUnique.mock.calls.every(([query]) => query.where.orderId === order.orderId)).toBe(true);
  });
  it.each([{}, { id: "bad" }, null])("rejects missing response fields %j", async value => {
    fetchMock.mockResolvedValue(response(value)); await expect(getPaymentById(order.orderId)).rejects.toMatchObject({ status: 503 });
  });
  it("handles malformed JSON and connection failures without consuming nonce", async () => {
    fetchMock.mockResolvedValueOnce(new Response("broken-json"));
    await expect(getPaymentById(order.orderId)).rejects.toMatchObject({ status: 503 });
    fetchMock.mockRejectedValueOnce(new Error("sensitive upstream details"));
    await expect(getPaymentById(order.orderId)).rejects.toMatchObject({ status: 503 });
    expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
  });
  it("aborts a hanging upstream request", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const pending = expect(getPaymentById(order.orderId)).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(8001); await pending;
  });
  it.each([9999, 10001, 10000.5])("never approves amount %s", async amount => {
    fetchMock.mockResolvedValue(response(payment({ amount: { total: amount } })));
    await expect(portoneProvider.payment.getPayment(order.orderId)).rejects.toMatchObject({ code: Number.isInteger(amount) ? "payment_failed" : "provider_unavailable" });
  });
  it.each([{ id: "another" }, { storeId: "another" }, { currency: "USD" },
    { channel: { key: "another", type: "TEST", pgProvider: "DANAL" } },
    { channel: { key: config.channelKey, type: "LIVE", pgProvider: "DANAL" } },
    { channel: { key: config.channelKey, type: "TEST", pgProvider: "OTHER" } }, { isForTest: false },
    { paidAt: "invalid" }, { paidAt: new Date(0).toISOString() }, { paidAt: new Date(Date.now() + 86400_000).toISOString() },
    { status: "PARTIAL_CANCELLED" }])("rejects mismatched provider data %j", async extra => {
    fetchMock.mockResolvedValue(response(payment(extra)));
    await expect(portoneProvider.payment.getPayment(order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  });
  it.each(["READY", "PAY_PENDING", "VIRTUAL_ACCOUNT_ISSUED"])("returns 409 for %s without approval fields", async status => {
    fetchMock.mockResolvedValue(response(payment({ status, transactionId: undefined, paidAt: undefined, channel: undefined })));
    await expect(portoneProvider.payment.getPayment(order.orderId)).rejects.toMatchObject({ code: "payment_pending", status: 409 });
  });
  it.each(["FAILED", "CANCELLED"])("represents %s without fabricating paidAt", async status => {
    fetchMock.mockResolvedValue(response(payment({ status, paidAt: undefined })));
    await expect(portoneProvider.payment.getPayment(order.orderId)).rejects.toBeInstanceOf(PortoneTerminalPayment);
  });
  it("rejects missing PAID approval fields", async () => {
    fetchMock.mockResolvedValue(response(payment({ transactionId: undefined, paidAt: undefined })));
    await expect(portoneProvider.payment.getPayment(order.orderId)).rejects.toMatchObject({ status: 503 });
  });
  it("rejects unknown references without contacting PortOne", async () => {
    await expect(portoneProvider.payment.getPayment("unknown")).rejects.toMatchObject({ code: "payment_failed" }); expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("test payment cancellation", () => {
  it("validates, cancels with the official endpoint, then requeries and audits", async () => {
    fetchMock.mockResolvedValueOnce(response(payment()))
      .mockResolvedValueOnce(response({ cancellation: { status: "SUCCEEDED" } }))
      .mockResolvedValueOnce(response(payment({ status: "CANCELLED" })));
    await portoneProvider.payment.cancelPayment(order.orderId);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`https://api.portone.io/payments/${order.orderId}/cancel`);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ storeId: config.storeId, requester: "ADMIN" });
    expect(fixture.audit).toHaveBeenCalledOnce();
  });
  it("does not send a cancel mutation to a live or foreign payment", async () => {
    fetchMock.mockResolvedValue(response(payment({ channel: { key: config.channelKey, type: "LIVE", pgProvider: "DANAL" } })));
    await expect(portoneProvider.payment.cancelPayment(order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
    expect(fetchMock).toHaveBeenCalledOnce(); expect(fixture.audit).not.toHaveBeenCalled();
  });
  it("rejects another order's transaction before requesting cancellation", async () => {
    fixture.findUnique.mockImplementation(async ({ where }) => where.orderId === order.orderId ? { ...order } : { orderId: "other" });
    await expect(portoneProvider.payment.cancelPayment(order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
    expect(fetchMock).toHaveBeenCalledOnce(); expect(fixture.audit).not.toHaveBeenCalled();
  });
  it("treats an already cancelled payment as idempotent", async () => {
    fetchMock.mockResolvedValue(response(payment({ status: "CANCELLED", paidAt: undefined })));
    await portoneProvider.payment.cancelPayment(order.orderId);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("does not report success for pending asynchronous cancellation", async () => {
    fetchMock.mockResolvedValueOnce(response(payment()))
      .mockResolvedValueOnce(response({ cancellation: { status: "REQUESTED" } }))
      .mockResolvedValueOnce(response(payment()));
    await expect(portoneProvider.payment.cancelPayment(order.orderId)).rejects.toMatchObject({ code: "provider_unavailable" });
    expect(fixture.audit).not.toHaveBeenCalled();
  });
});
