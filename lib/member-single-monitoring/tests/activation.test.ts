import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  orderFind: vi.fn(), propOther: vi.fn(), propFind: vi.fn(), propCreate: vi.fn(), propUpdate: vi.fn(),
  orderUpdate: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { memberSingleMonitoringOrder: {
  findUniqueOrThrow: async () => ({ userId: "u1" }),
} } }));
vi.mock("../transaction", () => ({
  lockedSingle: async (_u: string, run: (tx: unknown) => unknown) => run({
    memberSingleMonitoringOrder: { findUniqueOrThrow: db.orderFind, update: db.orderUpdate },
    monitoredProperty: { findFirst: db.propOther, findUnique: db.propFind, create: db.propCreate, update: db.propUpdate },
    auditLog: { create: db.audit },
  }),
}));

import { applySinglePaidOrder } from "../activation";

const paidOrder = { id: "o1", orderId: "msm_1", userId: "u1", address: "서울 강남 1", status: "paid", providerTransactionId: "tx1", appliedAt: null, monitoredPropertyId: null };

beforeEach(() => {
  vi.resetAllMocks();
  db.orderFind.mockResolvedValue({ ...paidOrder });
  db.propOther.mockResolvedValue(null);
  db.propFind.mockResolvedValue(null);
  db.propCreate.mockResolvedValue({ id: "p-new" });
  db.propUpdate.mockResolvedValue({ id: "p-exist" });
  db.orderUpdate.mockResolvedValue({});
  db.audit.mockResolvedValue({});
});

describe("applySinglePaidOrder", () => {
  it("신규 주소면 MonitoredProperty(source=single,active)를 생성하고 baseline 필요", async () => {
    const r = await applySinglePaidOrder("msm_1");
    expect(r.applied).toBe(true);
    expect(r.propertyId).toBe("p-new");
    expect(r.baselineNeeded).toBe(true);
    expect(db.propCreate).toHaveBeenCalledOnce();
    const data = db.propCreate.mock.calls[0][0].data;
    expect(data.source).toBe("single");
    expect(data.status).toBe("active");
    expect(data.paidUntil).toBeInstanceOf(Date);
  });

  it("다른 주소 단건이 이미 활성이면 needs_review(자동환불 금지)", async () => {
    db.propOther.mockResolvedValue({ id: "other" });
    await expect(applySinglePaidOrder("msm_1")).rejects.toMatchObject({ code: "payment_needs_review", status: 409 });
    expect(db.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "needs_review" } }));
    expect(db.propCreate).not.toHaveBeenCalled(); // 물건 생성 없이 needs_review
    expect(db.audit).toHaveBeenCalled();
  });

  it("동일 주소를 구독으로 이미 감시 중이면 needs_review(E5)", async () => {
    db.propFind.mockResolvedValue({ id: "p-sub", source: "subscription", status: "active" });
    await expect(applySinglePaidOrder("msm_1")).rejects.toMatchObject({ code: "payment_needs_review" });
    expect(db.audit).toHaveBeenCalled();
  });

  it("만료된 동일 주소 단건이면 재활성화(update)", async () => {
    db.propFind.mockResolvedValue({ id: "p-exist", source: "single", status: "expired", paidUntil: new Date(Date.now() - 1000), commUniqueNo: "1-2-3" });
    const r = await applySinglePaidOrder("msm_1");
    expect(r.applied).toBe(true);
    expect(r.propertyId).toBe("p-exist");
    expect(r.baselineNeeded).toBe(false); // commUniqueNo 있으면 baseline 스킵
    expect(db.propUpdate).toHaveBeenCalledOnce();
  });

  it("이미 적용된 주문(appliedAt)은 멱등 반환", async () => {
    db.orderFind.mockResolvedValue({ ...paidOrder, appliedAt: new Date(), monitoredPropertyId: "p-done" });
    const r = await applySinglePaidOrder("msm_1");
    expect(r.applied).toBe(true);
    expect(r.propertyId).toBe("p-done");
    expect(db.propCreate).not.toHaveBeenCalled();
  });
});
