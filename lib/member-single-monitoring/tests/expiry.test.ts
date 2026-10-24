import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ findMany: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { monitoredProperty: { findMany: db.findMany } } }));
vi.mock("../transaction", () => ({
  lockedSingle: async (_u: string, run: (tx: unknown) => unknown) => run({
    monitoredProperty: { updateMany: db.updateMany },
  }),
}));

import { expireSingleProperties } from "../expiry";

beforeEach(() => {
  vi.resetAllMocks();
  db.updateMany.mockResolvedValue({ count: 1 });
});

describe("expireSingleProperties", () => {
  it("만료된 단건을 expired로 전환한다", async () => {
    db.findMany.mockResolvedValue([{ id: "p1", userId: "u1" }, { id: "p2", userId: "u2" }]);
    const r = await expireSingleProperties(new Date());
    expect(r.expired).toBe(2);
    expect(db.updateMany).toHaveBeenCalledTimes(2);
    // 조건부 update: source=single·active·paidUntil<=now만
    const where = db.updateMany.mock.calls[0][0].where;
    expect(where.source).toBe("single");
    expect(where.status).toBe("active");
    expect(where.paidUntil.lte).toBeInstanceOf(Date);
  });

  it("만료 대상이 없으면 0건", async () => {
    db.findMany.mockResolvedValue([]);
    const r = await expireSingleProperties(new Date());
    expect(r.expired).toBe(0);
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("lock 대기 중 연장돼 조건 불일치면 세지 않는다", async () => {
    db.findMany.mockResolvedValue([{ id: "p1", userId: "u1" }]);
    db.updateMany.mockResolvedValue({ count: 0 }); // 이미 연장됨
    const r = await expireSingleProperties(new Date());
    expect(r.expired).toBe(0);
  });
});
