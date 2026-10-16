import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  property: vi.fn(), uniqueProperty: vi.fn(), updateProperty: vi.fn(), order: vi.fn(), pending: vi.fn(),
  updateOrder: vi.fn(), audit: vi.fn(), payment: vi.fn(), createOrder: vi.fn(),
}));
vi.mock("../transaction", () => ({ locked: async (_identity: string, run: (tx: unknown) => unknown) => run({
  guestMonitoring: { findFirst: f.property, findUniqueOrThrow: f.uniqueProperty, update: f.updateProperty },
  guestMonitoringOrder: { findFirst: f.pending, findUnique: f.order, findUniqueOrThrow: f.order, update: f.updateOrder, create: f.createOrder },
  auditLog: { create: f.audit },
}) }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestMonitoringOrder: { findUniqueOrThrow: vi.fn(async () => ({ guestMonitoring: { guestIdentityHash: "identity" } })) } } }));
vi.mock("@/lib/danal", () => ({ getDanalProvider: () => ({ mode: "mock", payment: { createPayment: f.payment } }) }));
vi.mock("../config", () => ({ ORDER_TTL: 1200000, assertDecrypted: vi.fn() }));
import { bindDraftRole } from "../draft-role";
import { createOrder } from "../order";
import { applyPaidOrder } from "../activation";

const identity = "identity";
const input = { purpose: "apply" as const, draftId: "draft", role: "owner" as const, guestName: "홍길동", guestPhone: "01012345678" };
const principal = { purpose: "apply", draftId: "draft", verifiedIdentityHash: identity };
const request = { purpose: "initial" as const, draftId: "draft", idempotencyKey: "10000000-0000-4000-8000-000000000001" };
const property = { id: "draft", role: "owner", guestName: " 홍 길 동 ", ownerName: "홍길동", address: "서울 강남구 1", commUniqueNo: "1234-1234-123456", guestIdentityHash: identity };
beforeEach(() => {
  vi.resetAllMocks();
  f.property.mockResolvedValue(property);
  f.uniqueProperty.mockResolvedValue(property);
  f.order.mockResolvedValue(null);
  f.pending.mockResolvedValue(null);
  f.payment.mockResolvedValue({});
});
describe("role binding", () => {
  it("writes a selected role and repeats the same selection without mutation", async () => {
    f.property.mockResolvedValueOnce({ id: "draft", role: null });
    await bindDraftRole(identity, input);
    expect(f.updateProperty).toHaveBeenCalledWith({ where: { id: "draft" }, data: { role: "owner" } });
    f.updateProperty.mockClear();
    await bindDraftRole(identity, input);
    expect(f.updateProperty).not.toHaveBeenCalled();
  });
  it("rejects role replacement, expired/foreign drafts, and orders already in progress", async () => {
    await expect(bindDraftRole(identity, { ...input, role: "tenant" })).rejects.toMatchObject({ code: "not_found" });
    f.property.mockResolvedValueOnce(null);
    await expect(bindDraftRole(identity, input)).rejects.toMatchObject({ code: "not_found" });
    f.property.mockResolvedValueOnce({ id: "draft", role: null });
    f.pending.mockResolvedValueOnce({ id: "paid-order" });
    await expect(bindDraftRole(identity, input)).rejects.toMatchObject({ code: "not_found" });
    expect(f.updateProperty).not.toHaveBeenCalled();
  });
  it("validates role before draft access and leaves lookup/renewal alone", async () => {
    await expect(bindDraftRole(identity, { ...input, role: undefined })).rejects.toMatchObject({ code: "invalid_input" });
    await bindDraftRole(identity, { ...input, purpose: "status", role: undefined, draftId: undefined });
    expect(f.property).not.toHaveBeenCalled();
  });
});
describe("order gates and callback defense", () => {
  it.each([null, "admin"])("blocks initial role %s before pending-order reuse", async role => {
    f.property.mockResolvedValueOnce({ ...property, role });
    await expect(createOrder(principal, request)).rejects.toMatchObject({ code: "invalid_input" });
    expect(f.pending).not.toHaveBeenCalled();
    expect(f.payment).not.toHaveBeenCalled();
  });
  it("blocks owner mismatch before pending-order reuse without names in the error", async () => {
    f.property.mockResolvedValueOnce({ ...property, guestName: "김철수" });
    await expect(createOrder(principal, request)).rejects.toMatchObject({ code: "owner_name_mismatch", status: 403, message: "owner_name_mismatch" });
    expect(f.pending).not.toHaveBeenCalled();
    expect(f.payment).not.toHaveBeenCalled();
  });
  it.each(["owner", "tenant"])("allows %s with server values and preserves unfinished-order reuse", async role => {
    f.property.mockResolvedValueOnce({ ...property, role, ...(role === "tenant" ? { guestName: "다른사람" } : {}) });
    f.pending.mockResolvedValueOnce({ orderId: "existing", status: "pending", providerMode: "mock", expiresAt: new Date(Date.now() + 60000) });
    expect((await createOrder(principal, request)).created).toBe(false);
    expect(f.createOrder).not.toHaveBeenCalled();
    expect(f.payment).toHaveBeenCalledOnce();
  });
  it("preserves exact-key retries and legacy renewal", async () => {
    f.property.mockResolvedValue({ ...property, role: null });
    f.order.mockResolvedValueOnce({ guestMonitoringId: "draft", purpose: "initial", status: "paid", providerMode: "mock" });
    expect((await createOrder(principal, request)).created).toBe(false);
    f.pending.mockResolvedValueOnce({ status: "paid", providerMode: "mock" });
    expect((await createOrder({ ...principal, purpose: "status" }, { ...request, purpose: "renewal", draftId: undefined, guestMonitoringId: "draft" })).created).toBe(false);
  });
  it.each([null, "owner"])("preserves paid evidence and audits invalid initial role %s", async role => {
    f.order.mockResolvedValue({ id: "paid-id", orderId: "paid", guestMonitoringId: "draft", status: "paid", providerTransactionId: "tx-paid", purpose: "initial", appliedAt: null });
    f.uniqueProperty.mockResolvedValueOnce({ ...property, role, guestName: "김철수" });
    await expect(applyPaidOrder("paid")).rejects.toMatchObject({ code: "payment_needs_review", status: 409 });
    expect(f.updateOrder).toHaveBeenCalledWith({ where: { id: "paid-id" }, data: { status: "needs_review" } });
    expect(f.audit).toHaveBeenCalledOnce();
    expect(JSON.stringify(f.audit.mock.calls)).not.toContain("김철수");
    expect(f.updateProperty).not.toHaveBeenCalled();
  });
  it.each(["owner", "tenant", "legacy-renewal"])("activates a valid %s paid order", async role => {
    f.order.mockResolvedValueOnce({ id: "paid-id", orderId: "paid", guestMonitoringId: "draft", status: "paid",
      providerTransactionId: "tx-paid", purpose: role === "legacy-renewal" ? "renewal" : "initial", appliedAt: null });
    f.uniqueProperty.mockResolvedValueOnce({ ...property, role: role === "legacy-renewal" ? null : role,
      guestName: role === "owner" ? property.guestName : "김철수", paidUntil: null, startedAt: null });
    f.property.mockResolvedValueOnce(null);
    expect(await applyPaidOrder("paid")).toEqual({ applied: true });
    expect(f.updateProperty).toHaveBeenCalledWith({ where: { id: "draft" }, data: {
      status: "active", startedAt: expect.any(Date), paidUntil: expect.any(Date), draftExpiresAt: null,
    } });
    expect(f.updateOrder).toHaveBeenCalledWith({ where: { id: "paid-id" }, data: {
      appliedPeriodStart: expect.any(Date), appliedPeriodEnd: expect.any(Date), appliedAt: expect.any(Date),
    } });
    expect(f.audit).not.toHaveBeenCalled();
  });
  it("does not re-gate an already applied legacy order", async () => {
    f.order.mockResolvedValueOnce({ appliedAt: new Date() });
    expect(await applyPaidOrder("legacy")).toEqual({ applied: true });
    expect(f.uniqueProperty).not.toHaveBeenCalled();
  });
});
