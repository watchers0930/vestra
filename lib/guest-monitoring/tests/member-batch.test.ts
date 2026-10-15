import { beforeEach, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ logs: vi.fn(), properties: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  monitoringCheckLog: { findMany: fixtures.logs },
  monitoredProperty: { findMany: fixtures.properties },
} }));
import { memberRetryTargetIds } from "@/lib/registry-monitor/retry-targets";
beforeEach(() => vi.clearAllMocks());
it("does not expand retry slots to unvisited member backlog", async () => {
  fixtures.logs.mockResolvedValue([{ monitoredPropertyId: "already-checked", result: "no_change" }]);
  fixtures.properties.mockResolvedValue([{ id: "remaining-member" }]);
  expect(await memberRetryTargetIds(new Date("2026-10-15T03:10:00Z"))).toEqual([]);
  expect(fixtures.properties).not.toHaveBeenCalled();
});
it("uses each member's latest result and excludes recovered members", async () => {
  fixtures.logs.mockResolvedValue([
    { monitoredPropertyId: "recovered", result: "no_change" },
    { monitoredPropertyId: "retry", result: "fetch_failed" },
    { monitoredPropertyId: "recovered", result: "fetch_failed" },
  ]);
  fixtures.properties.mockResolvedValue([{ id: "retry" }, { id: "unvisited" }]);
  expect(await memberRetryTargetIds(new Date("2026-10-15T03:10:00Z"))).toEqual(["retry"]);
  expect(fixtures.properties).not.toHaveBeenCalled();
});
