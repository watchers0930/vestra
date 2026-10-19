import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ property: vi.fn(), fetch: vi.fn(), update: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  guestMonitoring: { findMany: vi.fn(async () => [{ id: "property", guestIdentityHash: "identity" }]), findFirst: f.property },
  guestMonitoringOrder: { findMany: vi.fn(async () => [{ appliedPeriodStart: new Date("2026-10-01"), appliedPeriodEnd: new Date("2026-11-01") }]) },
  guestMonitoringCheckLog: { findMany: vi.fn(async () => [{ id: "log", checkedAt: new Date("2026-10-16"), method: "precheck", result: "signal_detected", riskLevel: "medium" }]) },
} }));
vi.mock("../transaction", () => ({ locked: async (_id: string, run: (tx: unknown) => unknown) => run({
  guestMonitoring: { updateMany: f.update }, guestMonitoringCheckLog: { create: f.log },
}) }));
vi.mock("../config", () => ({ guestMonitoringEnabled: () => true, assertDecrypted: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/tilko-api", () => ({ isTilkoAvailable: () => true, fetchRegistryCaseStatus: f.fetch }));
import { runGuestPrechecks } from "../precheck-adapter";
import { getCalendar, propertyDto } from "../calendar-dto";
import { buildSignalSummary } from "../signal-message";
const property = { id: "property", guestIdentityHash: "identity", role: "owner", address: "서울 강남구 테스트로 1 101동 1502호",
  commUniqueNo: "1146-1234-123456", ownerName: "홍길동", status: "active", startedAt: new Date("2026-10-01"), paidUntil: new Date("2099-11-01") };
beforeEach(() => {
  vi.resetAllMocks();
  f.property.mockResolvedValue(property);
  f.fetch.mockResolvedValue({ hasSignal: true, phase: "received", cases: [], summary: "untrusted raw text" });
  f.update.mockResolvedValue({ count: 1 });
});
describe("precheck and calendar role plumbing", () => {
  it.each(["owner", "tenant", null])("uses the same fixed summary for role %s without changing upstream identifiers", async role => {
    f.property.mockResolvedValue({ ...property, role });
    expect(await runGuestPrechecks()).toEqual({ processed: 1, failed: 0 });
    expect(f.fetch).toHaveBeenCalledWith({ reqAddress: property.address, commUniqueNo: property.commUniqueNo, ownerName: property.ownerName });
    const summary = buildSignalSummary(role, "signal_detected");
    expect(f.update.mock.calls[0][0].data.registrySignalSummary).toBe(summary);
    expect(f.log.mock.calls[0][0].data.summary).toBe(summary);
    const calendar = await getCalendar("identity", "property", "2026-10");
    expect(calendar.logs[0].summary).toBe(summary);
    expect(calendar.property.addressShort).toBe("서울 강남구 테스트로");
    expect(JSON.stringify(calendar)).not.toContain("홍길동");
    expect(JSON.stringify(calendar)).not.toContain("untrusted raw text");
  });
  it("records a failed upstream call as a retry message", async () => {
    f.fetch.mockRejectedValueOnce(new Error("upstream private diagnostics"));
    expect(await runGuestPrechecks()).toEqual({ processed: 1, failed: 1 });
    expect(f.update.mock.calls[0][0].data.registrySignalSummary).toBe(buildSignalSummary(null, "fetch_failed"));
  });
  it("records no-change without an alert", async () => {
    f.fetch.mockResolvedValueOnce({ hasSignal: false });
    await runGuestPrechecks();
    expect(f.update.mock.calls[0][0].data.registrySignalSummary).toBe(buildSignalSummary(null, "no_change"));
    expect(propertyDto(property).addressShort).toBe("서울 강남구 테스트로");
  });
});
