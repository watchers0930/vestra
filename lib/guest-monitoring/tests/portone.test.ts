import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), audit: vi.fn(), get: vi.fn(), cancel: vi.fn(),
  channels: [] as { impCode: string; mid: string; payMethod: "card"; pgProvider: "danal_tpay"; evidence: string }[] }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: { findUnique: f.find, updateMany: f.update }, auditLog: { create: f.audit } } }));
vi.mock("@/lib/danal/portone-v1-test-channels", () => ({ verifiedV1TestChannels: f.channels }));
vi.mock("@/lib/danal/iamport-rest", () => ({ getPaymentByImpUid: f.get, getPaymentByMerchantUid: f.get, cancelPaymentByImpUid: f.cancel }));
import { getDanalProvider } from "@/lib/danal";
import { getPortoneV1Config, resolvePaymentMode } from "@/lib/danal/portone-v1-config";
import { portoneV1Provider as provider } from "@/lib/danal/portone-v1";
import { encodeReceipt, newReceipt, parseReceipt, signCallbackContext, verifyCallbackContext } from "@/lib/danal/portone-callback";
import { PortoneTerminalPayment } from "@/lib/danal/portone-v1-payment";
const config = { impCode: "imp_fixture", mid: "fixture-mid", payMethod: "card" as const,
  pgProvider: "danal_tpay" as const, evidence: "isolated fixture; no real channel" };
function makeOrder() {
  return { id: "row", orderId: "ord_fixture", amount: 10000, currency: "KRW", providerMode: "portone_v1",
    createdAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000),
    providerReceipt: newReceipt() as string | null, providerTransactionId: null as string | null,
    appliedAt: null as Date | null, status: "pending" };
}
let order: ReturnType<typeof makeOrder>;
function payment(extra: Record<string, unknown> = {}) {
  return { imp_uid: "imp_fixture", merchant_uid: order.orderId, status: "paid", pg_id: config.mid,
    pg_provider: "danal_tpay", pay_method: "card", amount: 10000, currency: "KRW",
    paid_at: Math.floor((Date.now() - 1000) / 1000), cancel_amount: 0, cancelled_at: 0, cancel_history: [], ...extra };
}
async function launch() { return provider.payment.createPayment(order); }
function body(info: Record<string, string>) {
  return { paymentId: info.paymentId, imp_uid: "imp_fixture", callbackContext: info.callbackContext, callbackSignature: info.callbackSignature };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GUEST_PAYMENT_MODE", "portone_v1"); vi.stubEnv("DANAL_PROVIDER", "");
  vi.stubEnv("NEXT_PUBLIC_PORTONE_V1_IMP_CODE", config.impCode); vi.stubEnv("DANAL_MID", config.mid);
  vi.stubEnv("PORTONE_V1_REST_API_KEY", "fixture-rest-key"); vi.stubEnv("PORTONE_V1_REST_API_SECRET", "fixture-rest-secret");
  vi.stubEnv("SEARCH_INDEX_KEY", "signing-secret-fixture"); vi.stubEnv("AUTH_SECRET", "");
  f.channels.splice(0, f.channels.length, config); order = makeOrder();
  f.find.mockImplementation(async ({ where }) => where.orderId === order.orderId ||
    (order.providerTransactionId && where.providerTransactionId === order.providerTransactionId) ? { ...order } : null);
  f.update.mockImplementation(async ({ where, data }) => {
    if (order.providerReceipt !== where.providerReceipt) return { count: 0 };
    Object.assign(order, data); return { count: 1 };
  });
  f.get.mockImplementation(async () => payment());
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("V1 gate and resolver", () => {
  it.each([["", "", null], ["typo", "", null], ["portone", "", null], ["portone_v1", "mock", null],
    ["portone_v1", "", "portone_v1"], ["", "portone_v1", "portone_v1"], [" mock ", " mock ", "mock"]])("resolves %s / %s", (pay, dan, expected) => {
    vi.stubEnv("GUEST_PAYMENT_MODE", pay!); vi.stubEnv("DANAL_PROVIDER", dan!);
    if (expected) expect(resolvePaymentMode()).toBe(expected);
    else expect(resolvePaymentMode).toThrowError(expect.objectContaining({ code: "provider_unavailable", status: 503 }));
  });
  it.each(["NEXT_PUBLIC_PORTONE_V1_IMP_CODE", "DANAL_MID", "PORTONE_V1_REST_API_KEY", "PORTONE_V1_REST_API_SECRET", "SEARCH_INDEX_KEY"])("requires %s", name => {
    vi.stubEnv(name, ""); expect(getPortoneV1Config).toThrowError(expect.objectContaining({ status: 503 }));
  });
  it("requires evidence and exact channel account", () => {
    f.channels.splice(0); expect(getDanalProvider).toThrow();
    f.channels.push({ ...config, mid: "other" }); expect(getDanalProvider).toThrow();
    expect(f.get).not.toHaveBeenCalled();
  });
  it("retains mock isolation and production denial", () => {
    vi.stubEnv("GUEST_PAYMENT_MODE", "mock"); vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/guest_test");
    vi.stubEnv("GUEST_MONITORING_MOCK_ISOLATED", "true"); vi.stubEnv("DANAL_MOCK_SECRET", "x".repeat(32));
    expect(getDanalProvider().mode).toBe("mock");
    vi.stubEnv("NODE_ENV", "production"); expect(getDanalProvider).toThrow();
  });
  it("blocks identity and legacy V2 orders", async () => {
    await expect(provider.identity.startVerification({ nonce: "n", expiresAt: new Date() })).rejects.toMatchObject({ status: 503 });
    await expect(provider.identity.verifyResult({})).rejects.toMatchObject({ status: 503 });
    order.providerMode = "portone"; await expect(launch()).rejects.toMatchObject({ code: "payment_failed" });
    expect(order.providerMode).toBe("portone"); expect(f.update).not.toHaveBeenCalled();
  });
});
describe("V1 context", () => {
  it("returns the exact string DTO without secrets and reuses context", async () => {
    const first = await launch(); expect(await launch()).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(["provider", "impCode", "pg", "payMethod", "paymentId", "orderName", "amount", "currency", "expiresAt", "redirectPath", "callbackContext", "callbackSignature"].sort());
    expect(first).toMatchObject({ provider: "portone_v1", pg: "danal_tpay.fixture-mid", amount: "10000", payMethod: "card" });
    expect(JSON.stringify(first)).not.toContain("fixture-rest");
    expect(verifyCallbackContext(body(first)).storeId).toBe(config.impCode);
  });
  it("creates one stable receipt across simultaneous launches", async () => {
    order.providerReceipt = null;
    const [a, b] = await Promise.all([launch(), launch()]); expect(a).toEqual(b);
    expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
  });
  it.each([{ callbackSignature: "00".repeat(32) }, { imp_uid: "bad" }, { imp_uid: undefined },
    { paymentId: "other" }, { callbackContext: "bad==" }, { extra: true }])("rejects forged input %j before REST", async extra => {
    await expect(provider.payment.verifyPayment({ ...body(await launch()), ...extra })).rejects.toMatchObject({ code: "payment_failed" });
    expect(f.get).not.toHaveBeenCalled();
  });
  it.each(["nonce", "amount", "storeId", "expiresAt"])("rejects changed %s binding", async field => {
    const info = await launch(); const original = verifyCallbackContext(body(info));
    const value = field === "nonce" ? parseReceipt(newReceipt()).nonce : field === "amount" ? 9999 : field === "expiresAt" ? original.expiresAt + 1 : "wrong";
    const signed = signCallbackContext({ ...original, [field]: value });
    await expect(provider.payment.verifyPayment({ ...body(info), ...signed })).rejects.toMatchObject({ code: "payment_failed" });
    expect(f.get).not.toHaveBeenCalled();
  });
  it("rejects expired context and permits only a recorded transaction replay", async () => {
    const request = body(await launch()); const paidAt = Math.floor((Date.now() - 1000) / 1000);
    vi.useFakeTimers(); vi.setSystemTime(order.expiresAt.getTime() + 1);
    await expect(provider.payment.verifyPayment(request)).rejects.toMatchObject({ code: "payment_failed" });
    order.status = "paid"; order.providerTransactionId = "imp_fixture";
    order.providerReceipt = encodeReceipt({ ...parseReceipt(order.providerReceipt), consumed: true });
    f.get.mockResolvedValue(payment({ paid_at: paidAt }));
    await expect(provider.payment.verifyPayment(request)).resolves.toMatchObject({ transactionId: "imp_fixture" });
    await expect(provider.payment.verifyPayment({ ...request, imp_uid: "imp_other" })).rejects.toMatchObject({ code: "payment_failed" });
  });
});
describe("V1 payment mapping", () => {
  it("resolves a payment by orderId through REST merchant_uid", async () => {
    expect(order.providerTransactionId).toBeNull();
    await expect(provider.payment.getPayment(order.orderId)).resolves.toMatchObject({ verificationReference: "imp_fixture", transactionId: "imp_fixture", merchantId: config.mid });
    expect(f.get).toHaveBeenCalledWith(order.orderId);
    // imp_uid를 reference로 주면 주문을 찾지 못해 실패(기록 전엔 providerTransactionId 미설정).
    await expect(provider.payment.getPayment("imp_fixture")).rejects.toMatchObject({ code: "payment_failed" });
  });
  // imp_uid 교차대조는 getPayment가 아니라 호출부(payment-callback)가 수행하므로 getPayment 자체의
  // imp_uid 불일치 거부 케이스는 제외(verifyPayment 쪽에서 imp_uid 바인딩을 별도 검증).
  it.each([{ amount: 9999 }, { amount: 10001 }, { amount: 10000.5 }, { merchant_uid: "ord_other" },
    { pg_id: "other" }, { pg_provider: "danal" }, { pay_method: "vbank" }, { currency: "USD" },
    { sandbox: false }, { paid_at: 0 }, { paid_at: 1 }, { paid_at: 9999999999 },
    { status: "unknown" }, { cancel_amount: 1 }, { cancelled_at: 1 },
    { cancel_history: [{ amount: 1, cancelled_at: 1 }] },
    { status: "cancelled", cancel_amount: 5000, cancelled_at: 1 },
    { status: "failed" }, { status: "ready" }])("rejects mismatches %j", async extra => {
    f.get.mockResolvedValue(payment(extra));
    await expect(provider.payment.getPayment(order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  });
  it("converts Unix seconds to milliseconds", async () => {
    const value = payment(); f.get.mockResolvedValue(value);
    expect((await provider.payment.getPayment(order.orderId)).paidAt).toBe(value.paid_at * 1000);
  });
  it("returns pending without inventing approval fields", async () => {
    f.get.mockResolvedValue(payment({ status: "ready", paid_at: 0 }));
    await expect(provider.payment.getPayment(order.orderId)).rejects.toMatchObject({ code: "payment_pending", status: 409 });
  });
  it.each(["failed", "cancelled"])("carries unapproved %s without paidAt", async status => {
    f.get.mockResolvedValue(payment({ status, paid_at: 0 }));
    await expect(provider.payment.getPayment(order.orderId)).rejects.toBeInstanceOf(PortoneTerminalPayment);
  });
  it("preserves nonce after temporary failure", async () => {
    f.get.mockRejectedValueOnce(new Error("temporary")); const request = body(await launch());
    await expect(provider.payment.verifyPayment(request)).rejects.toThrow("temporary");
    expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
    await expect(provider.payment.verifyPayment(request)).resolves.toMatchObject({ status: "paid" });
  });
});
describe("verified full cancellation", () => {
  function canceled() { return payment({ status: "cancelled", cancel_amount: 10000, cancelled_at: Math.floor(Date.now() / 1000) }); }
  it("verifies, cancels only imp_uid, then rechecks full cancellation", async () => {
    f.get.mockResolvedValueOnce(payment()).mockResolvedValueOnce(canceled());
    await provider.payment.cancelPayment("imp_fixture");
    expect(f.cancel).toHaveBeenCalledWith("imp_fixture"); expect(f.get).toHaveBeenCalledTimes(2);
    expect(f.audit).toHaveBeenCalledOnce();
  });
  it("is idempotent for already fully cancelled transactions", async () => {
    f.get.mockResolvedValue(canceled()); await provider.payment.cancelPayment("imp_fixture"); expect(f.cancel).not.toHaveBeenCalled();
  });
  it("rejects another order's transaction before external mutation", async () => {
    f.find.mockImplementation(async ({ where }) => where.providerTransactionId ? { orderId: "ord_other" } : { ...order });
    await expect(provider.payment.cancelPayment("imp_fixture")).rejects.toMatchObject({ code: "payment_failed" }); expect(f.cancel).not.toHaveBeenCalled();
  });
  it("does not treat partial or still paid as successful cancellation", async () => {
    f.get.mockResolvedValue(payment());
    await expect(provider.payment.cancelPayment("imp_fixture")).rejects.toMatchObject({ status: 503 });
    f.get.mockResolvedValue(canceled()).mockResolvedValueOnce(payment()).mockResolvedValueOnce(payment({ status: "cancelled", cancel_amount: 5000 }));
    await expect(provider.payment.cancelPayment("imp_fixture")).rejects.toMatchObject({ code: "payment_failed" });
  });
});
