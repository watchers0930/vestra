import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ userFind: vi.fn(), groupBy: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: db.userFind }, monitoredProperty: { groupBy: db.groupBy } } }));
// release ON 시뮬(post-release 무료회원은 엔타이틀먼트 검사를 받음)
vi.mock("../config", () => ({ memberReleaseConfig: () => ({ effectiveAt: new Date("2020-01-01") }) }));
// 무료회원 = 유료기능 불가
vi.mock("../policy", () => ({ effectiveEntitlement: () => ({ canUsePaidFeatures: false, monitoringLimit: 0 }) }));

import { filterMemberMonitoringTargets } from "../monitoring-targets";

const future = new Date(Date.now() + 7 * 86400_000);
const past = new Date(Date.now() - 1000);

beforeEach(() => {
  vi.resetAllMocks();
  // 무료회원 u1 (post-release, membershipPolicy 없음)
  db.userFind.mockResolvedValue([{ id: "u1", role: "PERSONAL", verifyStatus: "none", createdAt: new Date(), subscription: null, membershipPolicy: null }]);
  db.groupBy.mockResolvedValue([]);
});

describe("filterMemberMonitoringTargets — 무료회원 단건(C2)", () => {
  it("무료회원이어도 active·미만료 단건은 감시 대상으로 통과시킨다", async () => {
    const props = [{ id: "s1", userId: "u1", source: "single", status: "active", paidUntil: future }];
    const r = await filterMemberMonitoringTargets(props, new Date());
    expect(r.map(p => p.id)).toEqual(["s1"]);
  });

  it("만료된 단건은 제외한다(무료회원은 구독 자격 없음)", async () => {
    const props = [{ id: "s-exp", userId: "u1", source: "single", status: "active", paidUntil: past }];
    const r = await filterMemberMonitoringTargets(props, new Date());
    expect(r).toHaveLength(0);
  });

  it("무료회원의 구독(source=subscription) 물건은 제외한다", async () => {
    const props = [{ id: "sub1", userId: "u1", source: "subscription", status: "active", paidUntil: null }];
    const r = await filterMemberMonitoringTargets(props, new Date());
    expect(r).toHaveLength(0);
  });

  it("단건 통과 + 구독 제외가 한 유저에서 동시에 정확히 분기된다", async () => {
    const props = [
      { id: "s1", userId: "u1", source: "single", status: "active", paidUntil: future },
      { id: "sub1", userId: "u1", source: "subscription", status: "active", paidUntil: null },
    ];
    const r = await filterMemberMonitoringTargets(props, new Date());
    expect(r.map(p => p.id)).toEqual(["s1"]);
  });
});
