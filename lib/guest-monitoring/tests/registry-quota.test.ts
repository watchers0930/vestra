import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const f = vi.hoisted(() => ({ properties: vi.fn(), guests: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  monitoredProperty: { findMany: f.properties }, monitoringCheckLog: { deleteMany: vi.fn(async () => ({})) }, auditLog: { deleteMany: vi.fn(async () => ({})) },
} }));
vi.mock("@/lib/cron-auth", () => ({ verifyCronSecret: () => true }));
vi.mock("@/lib/guest-monitoring/precheck-adapter", () => ({ runGuestPrechecks: f.guests, GUEST_BATCH_SIZE: 15 }));
vi.mock("@/lib/registry-monitor/check-log", () => ({ recordCheck: vi.fn(), recordCronHeartbeat: vi.fn(), CRON_HEARTBEAT_ACTION: "test" }));
vi.mock("@/lib/registry-monitor/transition", () => ({ autoTransitionExpiredGaps: vi.fn() }));
vi.mock("@/lib/member-single-monitoring/expiry", () => ({ expireSingleProperties: vi.fn(async () => ({ expired: 0 })) }));
import { GET } from "@/app/api/cron/registry-monitor/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T03:00:00Z"));
  f.properties.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());
it.each([0, 1, 7, 15])("reserves only actual guest work (%i) from member capacity", async processed => {
  f.guests.mockResolvedValue({ processed, failed: 0 });
  expect((await GET(new NextRequest("https://vestra.test/api/cron/registry-monitor"))).status).toBe(200);
  expect(f.properties.mock.calls[0][0].take).toBe(Math.floor((50 - processed) / 2));
  expect(f.properties.mock.calls[1][0].take).toBe(50 - processed);
});
it("reserves full guest quota when a failed run may have performed partial work", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    f.guests.mockRejectedValueOnce(new Error("partial failure"));
    expect((await GET(new NextRequest("https://vestra.test/api/cron/registry-monitor"))).status).toBe(200);
    expect(f.properties.mock.calls[1][0].take).toBe(35);
  } finally { log.mockRestore(); }
});
it("does not use guest quota for single-property diagnostic requests", async () => {
  expect((await GET(new NextRequest("https://vestra.test/api/cron/registry-monitor?propertyId=member"))).status).toBe(200);
  expect(f.guests).not.toHaveBeenCalled();
  expect(f.properties.mock.calls[0][0].take).toBe(50);
});
