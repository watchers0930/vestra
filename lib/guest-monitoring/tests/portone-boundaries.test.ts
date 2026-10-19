import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
const f = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(),
  update: vi.fn(), updateMany: vi.fn(), audit: vi.fn(), session: vi.fn(), ip: vi.fn(), limit: vi.fn(),
  verify: vi.fn(), get: vi.fn(), queue: Promise.resolve() }));
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
vi.mock("@/lib/guest-monitoring/session", () => ({ requireSession: f.session }));
vi.mock("@/lib/guest-monitoring/rate-limit-keys", () => ({ ipLimit: f.ip, guestLimit: f.limit }));
import { POST } from "@/app/api/guest-monitoring/payment/callback/route";
import { recordPayment } from "../record-payment";
import { paymentCallback } from "../payment-callback";
import { PortoneTerminalPayment } from "@/lib/danal/portone-v1-payment";
import { PortonePaymentNotFound } from "@/lib/danal/iamport-rest";
import { recordTerminalPayment } from "../record-terminal-payment";
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
  result = { orderId: row.orderId, transactionId: "imp_test", merchantId: "store-test", amount: 10000,
    currency: "KRW", paidAt: Date.now() - 1000, status: "paid", expiresAt: row.expiresAt.getTime(), verificationReference: "imp_test" };
  f.findUnique.mockImplementation(async ({ where }) => where.orderId === row.orderId || where.id === row.id ? { ...row } : null);
  f.findUniqueOrThrow.mockImplementation(async () => ({ ...row }));
  f.findFirst.mockResolvedValue({ orderId: row.orderId });
  f.updateMany.mockImplementation(async ({ where, data }) => {
    if (row.providerReceipt !== where.providerReceipt || row.appliedAt || ["paid", "needs_review", "refunded", "canceled"].includes(row.status)) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  });
  f.update.mockImplementation(async ({ data }) => { Object.assign(row, data); return { ...row }; });
  f.session.mockResolvedValue(principal);
  f.verify.mockRejectedValue(new GuestError("payment_pending", 409));
});
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, "https://hostile.example", "null"])("rejects Origin %s even with an allowed Referer", async origin => {
  const response = await POST(request(origin, "http://localhost:3000/"));
  expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ code: "forbidden" });
  expect(f.session).not.toHaveBeenCalled(); expect(f.verify).not.toHaveBeenCalled();
});
it("requires a verified session on the browser callback", async () => {
  f.session.mockRejectedValue(new GuestError("session_required", 401));
  const response = await POST(request("http://localhost:3000")); expect(response.status).toBe(401);
  expect(f.verify).not.toHaveBeenCalled();
});
it("checks identity ownership before REST verification", async () => {
  f.findFirst.mockResolvedValue(null);
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(404); expect(f.verify).not.toHaveBeenCalled();
  expect(f.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
    orderId: body.paymentId, providerMode: "portone_v1", guestMonitoring: { guestIdentityHash: principal.verifiedIdentityHash },
  } }));
});
it("returns the fixed pending message without persisting failure or consuming nonce", async () => {
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(409); expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ code: "payment_pending", error: "결제 승인을 확인하고 있습니다. 주문 상태를 다시 확인해주세요." });
  expect(f.updateMany).not.toHaveBeenCalled(); expect(f.update).not.toHaveBeenCalled();
});
it("keeps nonce unconsumed on upstream 503 and permits the same callback retry", async () => {
  f.verify.mockRejectedValueOnce(new GuestError("provider_unavailable", 503));
  expect((await POST(request("http://localhost:3000"))).status).toBe(503);
  expect((await POST(request("http://localhost:3000"))).status).toBe(409);
  expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
});
it.each(["verification", "requery", "terminal requery"])("returns retryable 503 for provider 404 during %s", async stage => {
  if (stage === "verification") f.verify.mockRejectedValueOnce(new PortonePaymentNotFound());
  else {
    if (stage === "requery") f.verify.mockResolvedValueOnce(result);
    else f.verify.mockRejectedValueOnce(new PortoneTerminalPayment(row.orderId, result.transactionId, "failed"));
    f.get.mockRejectedValueOnce(new PortonePaymentNotFound());
  }
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "provider_unavailable" });
  expect(row.status).toBe("pending"); expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
  expect(f.update).not.toHaveBeenCalled(); expect(f.updateMany).not.toHaveBeenCalled();
  // Identical request remains valid when the provider becomes visible.
  f.verify.mockRejectedValueOnce(new GuestError("payment_pending", 409));
  expect((await POST(request("http://localhost:3000"))).status).toBe(409);
});
it("rejects callback shape errors without provider calls", async () => {
  expect((await POST(request("http://localhost:3000", undefined, { ...body, amount: 10000 }))).status).toBe(400);
  expect(f.verify).not.toHaveBeenCalled();
});
it("records approval and consumes nonce once under repeated concurrent callbacks", async () => {
  const recorded = await Promise.all(Array.from({ length: 20 }, () => recordPayment(result)));
  expect(recorded.every(r => r?.status === "paid")).toBe(true);
  expect(f.updateMany).toHaveBeenCalledOnce(); expect(f.audit).toHaveBeenCalledOnce();
  expect(parseReceipt(row.providerReceipt).consumed).toBe(true);
  expect(row.providerTransactionId).toBe("imp_test");
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
it.each(["failed", "canceled"] as const)("checks transaction ownership even on a repeated terminal %s", async status => {
  row.status = status;
  f.findUnique.mockImplementation(async ({ where }) => where.providerTransactionId ? { orderId: "other" } : { ...row });
  await expect(recordTerminalPayment(new PortoneTerminalPayment(row.orderId, result.transactionId, status))).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.update).not.toHaveBeenCalled();
});
it("rejects a changed transaction binding at the terminal recording boundary", async () => {
  row.providerTransactionId = "different";
  await expect(recordTerminalPayment(new PortoneTerminalPayment(row.orderId, result.transactionId, "failed"))).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.update).not.toHaveBeenCalled();
});
it("does not accept a preconsumed nonce on an unpaid order", async () => {
  row.providerReceipt = encodeReceipt({ ...parseReceipt(row.providerReceipt), consumed: true });
  await expect(recordPayment(result)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.updateMany).not.toHaveBeenCalled();
});
it.each(["failed", "canceled"] as const)("persists confirmed %s without approval timestamp or nonce consumption", async status => {
  f.verify.mockRejectedValue(new PortoneTerminalPayment(row.orderId, "imp_test", status));
  f.get.mockRejectedValue(new PortoneTerminalPayment(row.orderId, "imp_test", status));
  await expect(paymentCallback(body, principal)).resolves.toEqual({ ok: true });
  expect(row.status).toBe(status); expect(row.paidAt).toBeNull(); expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
});
it("does not persist a terminal failure if requery disagrees", async () => {
  f.verify.mockRejectedValue(new PortoneTerminalPayment(row.orderId, "imp_test", "failed"));
  f.get.mockResolvedValue(result);
  await expect(paymentCallback(body, principal)).rejects.toMatchObject({ code: "payment_failed" });
  expect(f.update).not.toHaveBeenCalled();
});

it("recovers an apply failure through cron using the stored transaction ID exactly once", async () => {
  const activation = await import("../activation");
  const { recoverPayments } = await import("../recovery");
  f.verify.mockResolvedValue(result); f.get.mockResolvedValue(result);
  const apply = vi.spyOn(activation, "applyPaidOrder").mockRejectedValueOnce(new Error("apply interrupted"))
    .mockImplementation(async () => { row.appliedAt = new Date(); return { applied: true }; });
  f.findMany.mockImplementation(async () => row.status === "paid" && !row.appliedAt ? [row] : []);
  try {
    await expect(paymentCallback(body, principal)).rejects.toThrow("apply interrupted");
    expect(row.status).toBe("paid"); expect(parseReceipt(row.providerReceipt).consumed).toBe(true);
    expect(await recoverPayments()).toBe(1); expect(await recoverPayments()).toBe(0);
    expect(f.get).toHaveBeenLastCalledWith("imp_test");
    expect(f.updateMany).toHaveBeenCalledOnce(); expect(apply).toHaveBeenCalledTimes(2);
  } finally { apply.mockRestore(); }
});
it("leaves a paid order recoverable when cron sees provider 404", async () => {
  const activation = await import("../activation");
  const { recoverPayments } = await import("../recovery");
  await recordPayment(result);
  const receipt = row.providerReceipt;
  f.get.mockRejectedValueOnce(new PortonePaymentNotFound()).mockResolvedValue(result);
  f.findMany.mockImplementation(async () => !row.appliedAt ? [row] : []);
  const apply = vi.spyOn(activation, "applyPaidOrder").mockImplementation(async () => {
    row.appliedAt = new Date(); return { applied: true };
  });
  try {
    expect(await recoverPayments()).toBe(0);
    expect(row.status).toBe("paid"); expect(row.providerReceipt).toBe(receipt);
    expect(apply).not.toHaveBeenCalled();
    expect(await recoverPayments()).toBe(1); expect(await recoverPayments()).toBe(0);
    expect(apply).toHaveBeenCalledOnce(); expect(f.updateMany).toHaveBeenCalledOnce();
  } finally { apply.mockRestore(); }
});

it("maps malformed PortOne callback JSON to the contract error", async () => {
  const response = await POST(new NextRequest("http://localhost:3000/api/guest-monitoring/payment/callback", {
    method: "POST", body: "{broken", headers: { origin: "http://localhost:3000" },
  }));
  expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: "payment_failed" });
  expect(f.verify).not.toHaveBeenCalled();
});

it.each(["apply", "status", "renewal"])("accepts the owning %s session at both route and service", async purpose => {
  f.session.mockResolvedValue({ ...principal, purpose });
  const response = await POST(request("http://localhost:3000"));
  expect(response.status).toBe(409); // Provider pending, not a session rejection.
  expect(f.session).toHaveBeenCalledWith(expect.anything(), ["apply", "status", "renewal"]);
  expect(f.verify).toHaveBeenCalledWith(body);
});
it("still refuses another identity for a status session", async () => {
  f.session.mockResolvedValue({ ...principal, purpose: "status", verifiedIdentityHash: "other-identity" });
  f.findFirst.mockResolvedValue(null);
  expect((await POST(request("http://localhost:3000"))).status).toBe(404);
  expect(f.verify).not.toHaveBeenCalled();
});
it("confirms the terminal snapshot by orderId before imp_uid is stored", async () => {
  f.verify.mockRejectedValue(new PortoneTerminalPayment(row.orderId, "imp_test", "failed"));
  f.get.mockRejectedValue(new PortoneTerminalPayment(row.orderId, "imp_test", "failed"));
  expect((await POST(request("http://localhost:3000"))).status).toBe(200);
  // 2차 확인 읽기는 orderId(merchant_uid)로 재조회한다(imp_uid 직접조회 불가, 기록 전).
  expect(f.get).toHaveBeenCalledWith(row.orderId);
  expect(row.paidAt).toBeNull(); expect(row.providerTransactionId).toBeNull();
  expect(parseReceipt(row.providerReceipt).consumed).toBe(false);
});
it("preserves legacy paid V2 rows during V1 cron recovery", async () => {
  const { recoverPayments } = await import("../recovery");
  f.findMany.mockResolvedValue([{ ...row, status: "paid", providerMode: "portone", providerTransactionId: "legacy-v2" }]);
  expect(await recoverPayments()).toBe(0); expect(f.get).not.toHaveBeenCalled();
});
