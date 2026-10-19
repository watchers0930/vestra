import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  order: vi.fn(), property: vi.fn(), conflict: vi.fn(), initial: vi.fn(),
  updateOrder: vi.fn(), updateProperty: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: {
  findUniqueOrThrow: async () => ({ guestMonitoring: { guestIdentityHash: "identity" } }),
} } }));
vi.mock("../transaction", () => ({
  locked: async (_identity: string, run: (tx: unknown) => unknown) => run({
    guestMonitoring: { findUniqueOrThrow: db.property, findFirst: db.conflict, update: db.updateProperty },
    guestMonitoringOrder: { findUniqueOrThrow: db.order, findFirst: db.initial, update: db.updateOrder },
    auditLog: { create: db.audit },
  }),
}));

import { applyPaidOrder } from "../activation";
import * as config from "../config";
import { GuestError } from "../errors";

const property = {
  id: "draft", role: "owner", guestIdentityHash: "identity", guestName: "홍길동",
  ownerName: "홍길동", address: "서울 강남구 1", commUniqueNo: "1234-1234-123456",
  paidUntil: null, startedAt: null,
};
const paid = {
  id: "paid-id", orderId: "paid", guestMonitoringId: "draft", status: "paid",
  providerTransactionId: "tx-paid", purpose: "initial", appliedAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PII_ENCRYPTION_KEY", "activation-test-key");
  vi.stubEnv("PII_SALT", "activation-test-salt");
  vi.stubEnv("SEARCH_INDEX_KEY", "activation-test-search");
  vi.stubEnv("AUTH_SECRET", "");
  db.order.mockResolvedValue({ ...paid });
  db.property.mockResolvedValue({ ...property });
  db.conflict.mockResolvedValue(null);
  db.initial.mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function expectUnchanged() {
  expect(db.updateOrder).not.toHaveBeenCalled();
  expect(db.updateProperty).not.toHaveBeenCalled();
  expect(db.audit).not.toHaveBeenCalled();
}

describe("paid activation infrastructure failures stay retryable", () => {
  it.each(["owner", "tenant", "renewal"])("propagates missing crypto configuration for %s", async role => {
    db.order.mockResolvedValue({ ...paid, purpose: role === "renewal" ? "renewal" : "initial" });
    db.property.mockResolvedValue({ ...property, role: role === "renewal" ? null : role });
    vi.stubEnv("PII_ENCRYPTION_KEY", "");
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
    expectUnchanged();
  });

  it.each([
    ["owner", "guestName", "v1:encrypted"],
    ["owner", "ownerName", "v2:encrypted"],
    ["owner", "ownerName", null],
    ["owner", "address", "v1:encrypted"],
    ["tenant", "ownerName", "v1:encrypted"],
    ["tenant", "ownerName", null],
    ["tenant", "address", null],
    ["tenant", "address", "v1:encrypted"],
  ])("preserves the paid state for %s with unavailable %s (%s)", async (role, field, value) => {
    db.property.mockResolvedValueOnce({ ...property, role, [field!]: value });
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
    expectUnchanged();
    // The same paid order activates after recovery and subsequent callbacks are idempotent.
    db.property.mockResolvedValue({ ...property, role });
    expect(await applyPaidOrder("paid")).toEqual({ applied: true });
    expect(db.updateOrder).toHaveBeenCalledWith({ where: { id: paid.id }, data: {
      appliedAt: expect.any(Date), appliedPeriodStart: expect.any(Date), appliedPeriodEnd: expect.any(Date),
    } });
    db.order.mockResolvedValue({ ...paid, appliedAt: new Date() });
    expect(await applyPaidOrder("paid")).toEqual({ applied: true });
    expect(db.updateOrder).toHaveBeenCalledOnce();
    expect(db.updateProperty).toHaveBeenCalledOnce();
    expect(db.audit).not.toHaveBeenCalled();
  });

  it.each(["PII_SALT", "SEARCH_INDEX_KEY"])("also propagates missing %s", async key => {
    vi.stubEnv(key, "");
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "provider_unavailable" });
    expectUnchanged();
  });

  it.each([new GuestError("payment_failed"), new Error("unexpected crypto failure")])(
    "propagates other failures without creating a manual queue item", async error => {
      vi.spyOn(config, "assertDecrypted").mockImplementationOnce(() => { throw error; });
      await expect(applyPaidOrder("paid")).rejects.toBe(error);
      expectUnchanged();
    },
  );

  it.each([null, "admin", "owner"])("still queues permanent applicant conflict: %s", async role => {
    db.property.mockResolvedValue({ ...property, role, guestName: "다른사람" });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "payment_needs_review", status: 409 });
    expect(db.updateOrder).toHaveBeenCalledExactlyOnceWith({ where: { id: paid.id }, data: { status: "needs_review" } });
    expect(db.audit).toHaveBeenCalledWith({ data: {
      action: "GUEST_PAYMENT_NEEDS_REVIEW", target: "paid",
      detail: JSON.stringify({ reason: role === "owner" ? "owner_name_mismatch" : "invalid_input" }),
    } });
    expect(db.updateProperty).not.toHaveBeenCalled();
    db.order.mockResolvedValue({ ...paid, status: "needs_review" });
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "payment_needs_review" });
    expect(db.audit).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
