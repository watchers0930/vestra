import { afterEach, beforeEach, expect, it, vi } from "vitest";
const config = { impCode: "fixture", restKey: "fixture-key", restSecret: "fixture-secret", mid: "fixture-mid", pgProvider: "danal_tpay", payMethod: "card" };
vi.mock("@/lib/danal/portone-v1-config", () => ({ getPortoneV1Config: () => config }));
const fetchMock = vi.fn();
let rest: typeof import("@/lib/danal/iamport-rest");
function envelope(value: unknown, status = 200, code = 0) { return new Response(JSON.stringify({ code, message: null, response: value }), { status }); }
function token() { return { access_token: "fixture-token", expired_at: Math.floor(Date.now() / 1000) + 1800, now: Math.floor(Date.now() / 1000) }; }
function payment() { return { imp_uid: "imp_fixture", merchant_uid: "ord_fixture", amount: 10000, currency: "KRW", status: "paid",
  pg_provider: "danal_tpay", pg_id: config.mid, pay_method: "card", paid_at: Math.floor(Date.now() / 1000), cancel_amount: 0 }; }
beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks(); vi.stubGlobal("fetch", fetchMock);
  rest = await import("@/lib/danal/iamport-rest");
  fetchMock.mockImplementation(async (url: string) => envelope(url.endsWith("/users/getToken") ? token() : payment()));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("uses V1 token body and raw Authorization, encoded path, no-store, no redirects", async () => {
  await rest.getPaymentByImpUid("a/b?c");
  expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.iamport.kr/users/getToken", expect.objectContaining({ method: "POST", cache: "no-store", redirect: "error",
    body: JSON.stringify({ imp_key: config.restKey, imp_secret: config.restSecret }) }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.iamport.kr/payments/a%2Fb%3Fc", expect.objectContaining({
    headers: { Authorization: "fixture-token" }, cache: "no-store", redirect: "error" }));
});
it("coalesces simultaneous token requests and caches until expiry", async () => {
  await Promise.all(Array.from({ length: 20 }, () => rest.getPaymentByImpUid("imp_fixture")));
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("getToken"))).toHaveLength(1);
  vi.useFakeTimers(); await vi.advanceTimersByTimeAsync(1800_000);
  await rest.getPaymentByImpUid("imp_fixture");
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("getToken"))).toHaveLength(2);
});
it("refreshes once after payment 401 and never exposes a session 401", async () => {
  fetchMock.mockResolvedValueOnce(envelope(token())).mockResolvedValueOnce(envelope({}, 401))
    .mockResolvedValueOnce(envelope(token())).mockResolvedValueOnce(envelope(payment()));
  await expect(rest.getPaymentByImpUid("imp_fixture")).resolves.toMatchObject({ imp_uid: "imp_fixture" });
  expect(fetchMock).toHaveBeenCalledTimes(4);
  fetchMock.mockResolvedValue(envelope({}, 401));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
});
it("does not loop when refreshed credentials are rejected", async () => {
  fetchMock.mockImplementation(async (url: string) => envelope(url.endsWith("getToken") ? token() : {}, url.endsWith("getToken") ? 200 : 401));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
it.each([401, 403, 429, 500, 502])("sanitizes token HTTP %s", async status => {
  fetchMock.mockResolvedValue(envelope({ sensitive: "not-exposed" }, status));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503, message: "provider_unavailable" });
});
it.each([{ code: 1, response: token() }, { code: 0, response: {} }, { code: 0, response: { ...token(), expired_at: 1 } },
  { code: 0, response: { ...token(), access_token: "" } }])("rejects malformed token envelope %j", async value => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(value)));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
});
it.each([404, 429, 500])("sanitizes payment HTTP %s and keeps 404 retryable", async status => {
  fetchMock.mockResolvedValueOnce(envelope(token())).mockImplementation(async () => envelope({}, status));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
  if (status === 404) await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toBeInstanceOf(rest.PortonePaymentNotFound);
});
it.each([{}, null, { code: 0, response: {} }, { code: -1, response: payment() }])("rejects corrupt payment envelope %j", async value => {
  fetchMock.mockResolvedValueOnce(envelope(token())).mockImplementation(async () => new Response(JSON.stringify(value)));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
});
it("sanitizes invalid JSON and transport errors", async () => {
  fetchMock.mockResolvedValueOnce(new Response("invalid"));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
  fetchMock.mockRejectedValueOnce(new Error("sensitive"));
  await expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
});
it.each(["fetch", "decode"])("keeps 8 second timeout active during %s", async stage => {
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url, options) => {
    const hanging = () => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    return stage === "fetch" ? hanging() : Promise.resolve({ ok: true, status: 200, json: hanging });
  });
  const pending = expect(rest.getPaymentByImpUid("imp_fixture")).rejects.toMatchObject({ status: 503 });
  await vi.advanceTimersByTimeAsync(8001); await pending;
});
it("returns no candidate for an empty result and verifies the merchant UID", async () => {
  fetchMock.mockResolvedValueOnce(envelope(token())).mockResolvedValueOnce(envelope({ total: 0, next: 0, list: [] }));
  await expect(rest.findImpUidByMerchantUid("ord_fixture")).resolves.toBeNull();
  fetchMock.mockResolvedValueOnce(envelope({ total: 1, next: 0, list: [{ imp_uid: "imp_fixture", merchant_uid: "ord_fixture" }] }));
  await expect(rest.findImpUidByMerchantUid("ord_fixture")).resolves.toBe("imp_fixture");
  expect(fetchMock.mock.calls[1][0]).toBe("https://api.iamport.kr/payments/findAll/ord_fixture?page=1&limit=2");
  fetchMock.mockResolvedValueOnce(envelope({ total: 1, next: 0, list: [{ imp_uid: "imp_fixture", merchant_uid: "ord_other" }] }));
  await expect(rest.findImpUidByMerchantUid("ord_fixture")).rejects.toMatchObject({ code: "payment_failed" });
});
it.each([{ total: 2, next: 0, list: [{ imp_uid: "imp_a", merchant_uid: "ord_fixture" }, { imp_uid: "imp_b", merchant_uid: "ord_fixture" }] },
  { total: 1, next: 2, list: [{ imp_uid: "imp_a", merchant_uid: "ord_fixture" }] }])("refuses ambiguous candidate selection", async value => {
  fetchMock.mockResolvedValueOnce(envelope(token())).mockResolvedValueOnce(envelope(value));
  await expect(rest.findImpUidByMerchantUid("ord_fixture")).rejects.toMatchObject({ code: "payment_needs_review", status: 409 });
});
it("sends only the imp_uid for full cancellation", async () => {
  await rest.cancelPaymentByImpUid("imp_fixture");
  expect(fetchMock).toHaveBeenLastCalledWith("https://api.iamport.kr/payments/cancel", expect.objectContaining({ method: "POST", body: '{"imp_uid":"imp_fixture"}' }));
});

it("coalesces refresh after concurrent stale-token 401 responses", async () => {
  let tokens = 0;
  fetchMock.mockImplementation(async (url: string, options) => {
    if (url.endsWith("getToken")) return envelope({ ...token(), access_token: `token-${++tokens}` });
    if (options.headers.Authorization === "token-1") return envelope({}, 401);
    return envelope(payment());
  });
  await Promise.all(Array.from({ length: 20 }, () => rest.getPaymentByImpUid("imp_fixture")));
  expect(tokens).toBe(2);
});
it("invalidates the cached token after credential rotation", async () => {
  await rest.getPaymentByImpUid("imp_fixture");
  const previous = config.restSecret;
  try {
    config.restSecret = "rotated-fixture";
    await rest.getPaymentByImpUid("imp_fixture");
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("getToken"))).toHaveLength(2);
  } finally { config.restSecret = previous; }
});
