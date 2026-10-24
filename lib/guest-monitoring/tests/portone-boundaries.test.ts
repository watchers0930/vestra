import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
const f = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(),
  update: vi.fn(), updateMany: vi.fn(), audit: vi.fn(), session: vi.fn(), ip: vi.fn(), limit: vi.fn(),
  verify: vi.fn(), get: vi.fn(), v2get: vi.fn(), context: vi.fn(), queue: Promise.resolve() }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: {
  findMany: f.findMany, findUnique: f.findUnique, findUniqueOrThrow: f.findUniqueOrThrow, findFirst: f.findFirst,
  update: f.update, updateMany: f.updateMany,
}, auditLog: { create: f.audit } } }));
vi.mock("@/lib/guest-monitoring/transaction", () => ({ locked: (_identity: string, run: (tx: unknown) => Promise<unknown>) => {
  const result = f.queue.then(async () => run((await import("@/lib/prisma")).prisma));
  f.queue = result.then(() => undefined, () => undefined); return result;
} }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: () => ({ mode: "portone_v1", merchantId: "store-test",
  payment: { verifyPayment: f.verify, getPayment: f.get } }) }));
// V2 하이브리드 전환: 비회원 콜백 검증은 getPaymentByIdV2(V2 API)로. 결제조회를 mock한다.
vi.mock("@/lib/danal/portone-v2-rest", () => ({ getPaymentByIdV2: f.v2get }));
vi.mock("@/lib/member-subscription/provider", () => ({
  memberProviderConfig: () => ({ impCode: "imp88200033", mid: "store-test", storeId: "store-cd0c7ced", channelEnvironment: "test", merchantConfigVersion: "v1" }),
}));
vi.mock("@/lib/danal/portone-callback", async (orig) => {
  const actual = await orig<typeof import("@/lib/danal/portone-callback")>();
  // 콜백 서명 검증은 fixture에선 통과시키고, context는 주문 바인딩에 맞는 값을 돌려준다.
  return { ...actual, verifyCallbackContext: () => f.context() };
});
vi.mock("@/lib/guest-monitoring/session", () => ({ requireSession: f.session }));
vi.mock("@/lib/guest-monitoring/rate-limit-keys", () => ({ ipLimit: f.ip, guestLimit: f.limit }));
import { POST } from "@/app/api/guest-monitoring/payment/callback/route";
import { recordPayment } from "../record-payment";
import { encodeReceipt, newReceipt, parseReceipt } from "@/lib/danal/portone-callback";
import { GuestError } from "../errors";
import type { PaymentResult } from "@/lib/danal/types";
let row: ReturnType<typeof makeRow>;
let result: PaymentResult;
function makeRow() {
  return { id: "row", orderId: "ord_test", amount: 10000, currency: "KRW", providerMode: "portone_v1",
    providerReceipt: newReceipt(), status: "pending", providerTransactionId: null as string | null,
    paidAt: null as Date | null, appliedAt: null as Date | null,
    createdAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000),
    guestMonitoring: { guestIdentityHash: "identity-test" } };
}
/** V2Payment PAID 응답 — validateGuestPayment 통과 조건 충족. */
function paidV2() {
  return { id: row.orderId, status: "PAID", amount: { total: 10000, cancelled: 0 }, currency: "KRW",
    channel: { pgProvider: "DANAL_TPAY", pgMerchantId: "store-test", type: "TEST" },
    paidAt: new Date(Date.now() - 1000).toISOString(), storeId: "store-cd0c7ced" };
}
const body = { paymentId: "ord_test", imp_uid: "imp_test", callbackContext: "fixture", callbackSignature: "a".repeat(64) };
const principal = { verifiedIdentityHash: "identity-test", purpose: "apply", draftId: "draft" };
function request(origin?: string, referer?: string, payload: unknown = body) {
  return new NextRequest("http://localhost:3000/api/guest-monitoring/payment/callback", {
    method: "POST", body: JSON.stringify(payload), headers: {
      ...(origin ? { origin } : {}), ...(referer ? { referer } : {}), "content-type": "application/json",
    },
  });
}
beforeEach(() => {
  vi.resetAllMocks(); f.queue = Promise.resolve();
  vi.stubEnv("GUEST_PAYMENT_MODE", "portone_v1"); vi.stubEnv("DANAL_PROVIDER", "");
  vi.stubEnv("GUEST_MONITORING_ENABLED", "true"); vi.stubEnv("PII_ENCRYPTION_KEY", "fixture-key");
  vi.stubEnv("PII_SALT", "fixture-salt"); vi.stubEnv("SEARCH_INDEX_KEY", "fixture-signing-key");
  row = makeRow();
  result = { orderId: row.orderId, transactionId: row.orderId, merchantId: "store-test", amount: 10000,
    currency: "KRW", paidAt: Date.now() - 1000, status: "paid", expiresAt: row.expiresAt.getTime(), verificationReference: row.orderId };
  f.findUnique.mockImplementation(async ({ where }) => where.orderId === row.orderId || where.id === row.id ? { ...row } : null);
  f.findUniqueOrThrow.mockImplementation(async () => ({ ...row }));
  f.findFirst.mockResolvedValue({ ...row });
  f.updateMany.mockImplementation(async ({ where, data }) => {
    if (row.providerReceipt !== where.providerReceipt || row.appliedAt || ["paid", "needs_review", "refunded", "canceled"].includes(row.status)) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  });
  f.update.mockImplementation(async ({ data }) => { Object.assign(row, data); return { ...row }; });
  f.session.mockResolvedValue(principal);
  // V2 경로: 기본은 미결제(null=pending). context는 주문에 정확히 바인딩된 값(통과 기본).
  f.v2get.mockResolvedValue(null);
  f.context.mockImplementation(() => ({ v: 1, purpose: "guest_payment_v1", paymentId: row.orderId, orderId: row.orderId,
    storeId: "store-cd0c7ced", amount: row.amount, currency: "KRW", expiresAt: row.expiresAt.getTime(),
    nonce: parseReceipt(row.providerReceipt).nonce }));
});
afterEach(() => vi.unstubAllEnvs());

// ── 라우트 보안(CSRF·세션·소유) — V2 전환 후에도 유지 ──
it.each([undefined, "https://hostile.example", "null"])("rejects Origin %s even with an allowed Referer", async origin => {
  const response = await POST(request(origin, "http://localhost:3000/"));
  expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ code: "forbidden" });
  expect(f.session).not.toHaveBeenCalled(); expect(f.v2get).not.toHaveBeenCalled();
});
it("requires a verified session on the browser callback", async () => {
  f.session.mockRejectedValue(new GuestError("session_required", 401));
  const response = await POST(request("http://localhost:3000")); expect(response.status).toBe(401);
  expect(f.v2get).not.toHaveBeenCalled();
});
it("checks identity ownership before V2 verification", async () => {
  f.findFirst.mockResolvedValue(null);
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(404); expect(f.v2get).not.toHaveBeenCalled();
  expect(f.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
    orderId: body.paymentId, providerMode: "portone_v1", guestMonitoring: { guestIdentityHash: principal.verifiedIdentityHash },
  } }));
});
it.each(["apply", "status", "renewal"])("accepts the owning %s session then verifies via V2", async purpose => {
  f.session.mockResolvedValue({ ...principal, purpose });
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(409); // v2 미결제(pending) — 세션 거부가 아님.
  expect(f.session).toHaveBeenCalledWith(expect.anything(), ["apply", "status", "renewal"]);
  expect(f.v2get).toHaveBeenCalledWith(row.orderId);
});
it("still refuses another identity for a status session", async () => {
  f.session.mockResolvedValue({ ...principal, purpose: "status", verifiedIdentityHash: "other-identity" });
  f.findFirst.mockResolvedValue(null);
  expect((await POST(request("http://localhost:3000"))).status).toBe(404);
  expect(f.v2get).not.toHaveBeenCalled();
});
it("rejects callback shape errors without provider calls", async () => {
  expect((await POST(request("http://localhost:3000", undefined, { ...body, paymentId: 123 }))).status).toBe(400);
  expect(f.v2get).not.toHaveBeenCalled();
});
it("maps malformed PortOne callback JSON to the contract error", async () => {
  const response = await POST(new NextRequest("http://localhost:3000/api/guest-monitoring/payment/callback", {
    method: "POST", body: "{broken", headers: { origin: "http://localhost:3000" },
  }));
  expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: "payment_failed" });
  expect(f.v2get).not.toHaveBeenCalled();
});

// ── V2 검증 경로: 승인 후 멈춤 해소(성공) + 복원력(provider 일시 오류) ──
it("records paid and activates on V2 PAID (승인 후 멈춤 해소 핵심 경로)", async () => {
  const activation = await import("../activation");
  const apply = vi.spyOn(activation, "applyPaidOrder").mockResolvedValue({ applied: true });
  try {
    f.v2get.mockResolvedValue(paidV2());
    const response = await POST(request("http://localhost:3000"));
    expect(response.status).toBe(200);
    expect(row.status).toBe("paid"); expect(row.providerTransactionId).toBe(row.orderId);
    expect(parseReceipt(row.providerReceipt).consumed).toBe(true);
    expect(apply).toHaveBeenCalledWith(row.orderId);
  } finally { apply.mockRestore(); }
});
it("stays retryable with nonce unconsumed when V2 lookup is unavailable", async () => {
  f.v2get.mockImplementation(async () => { throw new GuestError("provider_unavailable", 503); });
  expect((await POST(request("http://localhost:3000"))).status).toBe(503);
  expect(row.status).toBe("pending"); expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
  expect(f.update).not.toHaveBeenCalled(); expect(f.updateMany).not.toHaveBeenCalled();
  // 동일 콜백 재시도: provider가 다시 보이면(여기선 pending) 그대로 유효.
  f.v2get.mockResolvedValue(null);
  expect((await POST(request("http://localhost:3000"))).status).toBe(409);
});
it("needs_review when the two V2 reads disagree (refund between reads)", async () => {
  f.v2get.mockResolvedValueOnce(paidV2()).mockResolvedValueOnce({ ...paidV2(), status: "CANCELLED", amount: { total: 10000, cancelled: 10000 } });
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "payment_needs_review" });
  expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
});

// ── record-payment 경계(consume-once·replay·cross-table) — V2에서도 재사용되어 유효 ──
it("records approval and consumes nonce once under repeated concurrent callbacks", async () => {
  const recorded = await Promise.all(Array.from({ length: 20 }, () => recordPayment(result)));
  expect(recorded.every(r => r?.status === "paid")).toBe(true);
  expect(f.updateMany).toHaveBeenCalledOnce(); expect(f.audit).toHaveBeenCalledOnce();
  expect(parseReceipt(row.providerReceipt).consumed).toBe(true);
  expect(row.providerTransactionId).toBe(row.orderId);
});
it("does not release needs_review or accept a different transaction on replay", async () => {
  await recordPayment(result); row.status = "needs_review";
  await expect(recordPayment(result)).rejects.toMatchObject({ code: "payment_needs_review", status: 409 });
  row.status = "paid"; row.appliedAt = new Date();
  await expect(recordPayment({ ...result, transactionId: "other" })).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.updateMany).toHaveBeenCalledOnce();
});
it("rejects reuse of another order's transaction", async () => {
  f.findUnique.mockImplementation(async ({ where }) => where.providerTransactionId ? { orderId: "other" } : { ...row });
  await expect(recordPayment(result)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.updateMany).not.toHaveBeenCalled();
});
it("checks transaction ownership once when recording a fresh approval", async () => {
  await recordPayment(result);
  expect(f.findUnique.mock.calls.filter(([query]) => query.where.providerTransactionId)).toHaveLength(1);
});
it("rejects a concurrent transaction claim through the unique constraint", async () => {
  f.updateMany.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  await expect(recordPayment(result)).rejects.toMatchObject({ code: "payment_failed" });
  expect(parseReceipt(row.providerReceipt).consumed).toBe(false); expect(f.audit).not.toHaveBeenCalled();
});
it.each(["failed", "canceled"] as const)("checks ownership before recording %s with an approval timestamp", async status => {
  f.findUnique.mockImplementation(async ({ where }) => where.providerTransactionId ? { orderId: "other" } : { ...row });
  await expect(recordPayment({ ...result, status })).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.update).not.toHaveBeenCalled(); expect(f.updateMany).not.toHaveBeenCalled();
});
it("does not accept a preconsumed nonce on an unpaid order", async () => {
  row.providerReceipt = encodeReceipt({ ...parseReceipt(row.providerReceipt), consumed: true });
  await expect(recordPayment(result)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.updateMany).not.toHaveBeenCalled();
});

// ── 복구 cron: V2 전환 후에도 legacy paid 행을 건드리지 않음 ──
it("preserves legacy paid V2 rows during cron recovery", async () => {
  const { recoverPayments } = await import("../recovery");
  f.findMany.mockResolvedValue([{ ...row, status: "paid", providerMode: "portone", providerTransactionId: "legacy-v2" }]);
  expect(await recoverPayments()).toBe(0); expect(f.get).not.toHaveBeenCalled();
});
