import { afterEach, beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ find: vi.fn(), candidates: vi.fn(), callback: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: { findFirst: f.find } } }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: () => ({ mode: "portone_v1" }) }));
vi.mock("@/lib/danal/iamport-rest", () => ({ findImpUidByMerchantUid: f.candidates }));
vi.mock("../payment-callback", () => ({ paymentCallback: f.callback }));
vi.mock("../rate-limit-keys", () => ({ guestLimit: f.limit }));
vi.mock("@/lib/danal/portone-v1-test-channels", () => ({ verifiedV1TestChannels: [
  { impCode: "fixture", mid: "fixture", pgProvider: "danal_tpay", payMethod: "card", evidence: "isolated fixture only" },
] }));
import { encodeReceipt, newReceipt, parseReceipt, verifyCallbackContext } from "@/lib/danal/portone-callback";
import { recoverPendingPayment } from "../recover-pending-payment";
import { GuestError } from "../errors";
const principal = { verifiedIdentityHash: "identity", purpose: "status", draftId: null };
let order: { orderId: string; amount: number; currency: string; status: string; providerReceipt: string; expiresAt: Date };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_PORTONE_V1_IMP_CODE", "fixture"); vi.stubEnv("DANAL_MID", "fixture");
  vi.stubEnv("PORTONE_V1_REST_API_KEY", "fixture"); vi.stubEnv("PORTONE_V1_REST_API_SECRET", "fixture");
  vi.stubEnv("SEARCH_INDEX_KEY", "fixture");
  order = { orderId: "ord_fixture", amount: 10000, currency: "KRW", status: "pending", providerReceipt: newReceipt(), expiresAt: new Date(Date.now() + 60000) };
  f.find.mockImplementation(async () => ({ ...order }));
  f.candidates.mockResolvedValue("imp_found"); f.callback.mockResolvedValue({ ok: true });
});
afterEach(() => vi.unstubAllEnvs());
it("binds the verified identity before candidate lookup and uses the existing nonce", async () => {
  await expect(recoverPendingPayment(principal, order.orderId)).resolves.toEqual({ ok: true });
  expect(f.find).toHaveBeenCalledWith(expect.objectContaining({ where: {
    orderId: order.orderId, providerMode: "portone_v1", guestMonitoring: { guestIdentityHash: principal.verifiedIdentityHash },
  } }));
  expect(f.candidates).toHaveBeenCalledWith(order.orderId);
  const [body, session] = f.callback.mock.calls[0];
  expect(session).toBe(principal); expect(body.imp_uid).toBe("imp_found");
  expect(verifyCallbackContext(body).nonce).toBe(parseReceipt(order.providerReceipt).nonce);
  expect(parseReceipt(order.providerReceipt).consumed).toBe(false);
});
it("refuses unauthorized session purposes and invalid order identifiers", async () => {
  await expect(recoverPendingPayment({ ...principal, purpose: "unknown" }, order.orderId)).rejects.toMatchObject({ status: 401 });
  await expect(recoverPendingPayment({ ...principal, verifiedIdentityHash: "" }, order.orderId)).rejects.toMatchObject({ status: 401 });
  await expect(recoverPendingPayment(principal, "../bad")).rejects.toMatchObject({ status: 404 });
  expect(f.candidates).not.toHaveBeenCalled();
});
it.each(["paid", "failed", "canceled", "refunded"])("does not query candidates for a %s order", async status => {
  order.status = status;
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.candidates).not.toHaveBeenCalled(); expect(f.callback).not.toHaveBeenCalled();
});
it("rejects consumed or malformed receipts and wrong currency before REST", async () => {
  order.providerReceipt = encodeReceipt({ ...parseReceipt(order.providerReceipt), consumed: true });
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  order.providerReceipt = "broken";
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  order.providerReceipt = newReceipt(); order.currency = "USD";
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.candidates).not.toHaveBeenCalled();
});
it("keeps the nonce reusable after a transient candidate lookup failure", async () => {
  const receipt = order.providerReceipt;
  f.candidates.mockRejectedValueOnce(new GuestError("provider_unavailable", 503));
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ status: 503 });
  expect(order.providerReceipt).toBe(receipt); expect(f.callback).not.toHaveBeenCalled();
  await expect(recoverPendingPayment(principal, order.orderId)).resolves.toEqual({ ok: true });
});
it("refuses another identity before REST", async () => {
  f.find.mockResolvedValue(null);
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ status: 404 });
  expect(f.candidates).not.toHaveBeenCalled();
});
it("keeps empty and ambiguous results out of callback recording", async () => {
  f.candidates.mockResolvedValueOnce(null).mockRejectedValueOnce(new GuestError("payment_needs_review", 409));
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_pending" });
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_needs_review" });
  expect(f.callback).not.toHaveBeenCalled();
});
it("rejects expired pending and manual review before candidate lookup", async () => {
  order.expiresAt = new Date(0);
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_failed" });
  order.status = "needs_review";
  await expect(recoverPendingPayment(principal, order.orderId)).rejects.toMatchObject({ code: "payment_needs_review" });
  expect(f.candidates).not.toHaveBeenCalled();
});
