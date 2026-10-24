import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findUnique: vi.fn(), count: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/danal", () => ({
  getDanalProvider: () => ({ mode: "mock", merchantId: "m", payment: {
    createPayment: async (o: { orderId: string }) => ({ provider: "mock", orderId: o.orderId }),
  } }),
}));
vi.mock("../transaction", () => ({
  lockedSingle: async (_userId: string, run: (tx: unknown) => unknown) => run({
    memberSingleMonitoringOrder: { findUnique: db.findUnique, findFirst: db.findFirst, updateMany: db.updateMany, create: db.create },
    monitoredProperty: { count: db.count },
  }),
}));

import { createSingleOrder } from "../order";
import { SingleError } from "../errors";

beforeEach(() => {
  vi.resetAllMocks();
  db.findUnique.mockResolvedValue(null);
  db.count.mockResolvedValue(0);
  db.findFirst.mockResolvedValue(null);
  db.updateMany.mockResolvedValue({ count: 0 });
  db.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data, status: "pending", expiresAt: new Date(Date.now() + 60_000),
  }));
});

const input = { address: "서울 강남구 역삼동 1", idempotencyKey: "11111111-1111-1111-1111-111111111111" };

describe("createSingleOrder", () => {
  it("신규 주문을 생성한다(created=true, 결제정보 포함)", async () => {
    const r = await createSingleOrder("u1", input);
    expect(r.created).toBe(true);
    expect(r.data.amount).toBe(10000);
    expect(r.data.orderId).toMatch(/^msm_[a-f0-9]{32}$/);
    expect(db.create).toHaveBeenCalledOnce();
  });

  it("활성 단건이 이미 1건이면 single_limit로 거부한다", async () => {
    db.count.mockResolvedValue(1);
    await expect(createSingleOrder("u1", input)).rejects.toMatchObject({ code: "single_limit", status: 409 });
    expect(db.create).not.toHaveBeenCalled();
  });

  it("동일 idempotencyKey는 기존 주문을 멱등 반환한다(created=false)", async () => {
    db.findUnique.mockResolvedValue({ orderId: "msm_x", address: input.address, amount: 10000, currency: "KRW", status: "pending", providerMode: "mock", expiresAt: new Date(Date.now() + 60_000) });
    const r = await createSingleOrder("u1", input);
    expect(r.created).toBe(false);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("미결제/미적용 주문이 있으면 새로 만들지 않고 반환한다", async () => {
    db.findFirst.mockResolvedValue({ orderId: "msm_y", address: input.address, amount: 10000, currency: "KRW", status: "pending", providerMode: "mock", expiresAt: new Date(Date.now() + 60_000) });
    const r = await createSingleOrder("u1", input);
    expect(r.created).toBe(false);
    expect(db.create).not.toHaveBeenCalled();
  });

  it("동일 키에 다른 주소면 invalid_input", async () => {
    db.findUnique.mockResolvedValue({ orderId: "msm_z", address: "다른 주소", status: "pending" });
    await expect(createSingleOrder("u1", input)).rejects.toBeInstanceOf(SingleError);
  });
});
