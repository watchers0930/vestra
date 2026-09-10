/**
 * lib/audit-log.ts PII 접근 감사·이상탐지 테스트 (P0-4)
 * - 로그에 PII 평문이 담기지 않는다(resource·건수만).
 * - 임계 초과 시 PII_ANOMALY 기록, 이내면 미기록, 최근 알림 있으면 중복 억제.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { create, count, findFirst } = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({}),
  count: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create, count, findFirst } },
}));
vi.mock("@/lib/system-settings", () => ({ maskValue: (v: string) => "****" + String(v).slice(-2) }));

import { recordPiiAccess } from "@/lib/audit-log";

/** fire-and-forget 비동기(detectPiiAnomaly) 완료 대기 */
const flush = () => new Promise((r) => setTimeout(r, 5));

const fakeReq = () => new Request("https://x.test", { headers: { "user-agent": "vitest" } });

describe("recordPiiAccess (PII 감사)", () => {
  beforeEach(() => {
    create.mockClear();
    count.mockReset();
    findFirst.mockReset();
    count.mockResolvedValue(0);
    findFirst.mockResolvedValue(null);
  });

  it("PII_ACCESS를 기록하되 detail에 PII 평문이 없다(resource·건수만)", async () => {
    recordPiiAccess({ req: fakeReq(), userId: "u1", resource: "agent_client_list", targetId: "agent1", recordCount: 12 });
    await flush();

    const accessCall = create.mock.calls.find((c) => c[0].data.action === "PII_ACCESS");
    expect(accessCall).toBeTruthy();
    const data = accessCall![0].data;
    expect(data.target).toBe("agent1");
    const detail = JSON.parse(data.detail);
    expect(detail).toEqual({ resource: "agent_client_list", recordCount: 12 });
    // PII로 오해될 필드가 없어야 한다
    expect(JSON.stringify(detail)).not.toMatch(/@|010-|clientName|phone|email/i);
  });

  it("윈도우 내 접근이 임계(50) 초과 + 최근 알림 없음 → PII_ANOMALY 기록", async () => {
    count.mockResolvedValue(51);
    findFirst.mockResolvedValue(null);

    recordPiiAccess({ req: fakeReq(), userId: "u1", resource: "agent_client_list", targetId: "agent1", recordCount: 1 });
    await flush();

    const anomaly = create.mock.calls.find((c) => c[0].data.action === "PII_ANOMALY");
    expect(anomaly).toBeTruthy();
    expect(JSON.parse(anomaly![0].data.detail).accessCount).toBe(51);
  });

  it("임계 이내면 PII_ANOMALY 미기록", async () => {
    count.mockResolvedValue(10);
    recordPiiAccess({ req: fakeReq(), userId: "u1", resource: "agent_client_list", targetId: "agent1", recordCount: 1 });
    await flush();
    expect(create.mock.calls.some((c) => c[0].data.action === "PII_ANOMALY")).toBe(false);
  });

  it("최근 PII_ANOMALY가 있으면 중복 억제", async () => {
    count.mockResolvedValue(99);
    findFirst.mockResolvedValue({ id: "prev" });
    recordPiiAccess({ req: fakeReq(), userId: "u1", resource: "agent_client_list", targetId: "agent1", recordCount: 1 });
    await flush();
    expect(create.mock.calls.some((c) => c[0].data.action === "PII_ANOMALY")).toBe(false);
  });

  it("게스트(userId 없음)는 이상탐지 쿼리를 돌리지 않는다", async () => {
    recordPiiAccess({ req: fakeReq(), userId: null, resource: "public", recordCount: 1 });
    await flush();
    expect(count).not.toHaveBeenCalled();
  });
});
