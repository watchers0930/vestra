import { describe, it, expect } from "vitest";
import { addKstMonth, paidPeriod, monthBounds, kstMonth } from "../period";
describe("KST calendar month contract", () => {
  it.each([
    ["2026-01-30T16:01:02.003Z", "2026-02-27T16:01:02.003Z"],
    ["2024-01-30T16:01:02.003Z", "2024-02-28T16:01:02.003Z"],
    ["2026-12-30T16:01:02.003Z", "2027-01-30T16:01:02.003Z"],
    ["2026-10-15T00:00:00.000Z", "2026-11-15T00:00:00.000Z"],
  ])("clamps %s to %s without a fixed 30-day duration", (from, to) => {
    expect(addKstMonth(new Date(from)).toISOString()).toBe(to);
  });
  it("extends future expiry and restarts at the exact expiry boundary", () => {
    const now = new Date("2026-10-15T00:00:00Z");
    const future = new Date("2026-10-20T00:00:00Z");
    expect(paidPeriod(now, future).start).toEqual(future);
    expect(paidPeriod(now, now).start).toEqual(now);
    expect(paidPeriod(now, new Date(0)).start).toEqual(now);
  });
  it("uses KST rather than the process timezone for calendar bounds", () => {
    expect(kstMonth(new Date("2026-09-30T15:00:00Z"))).toBe("2026-10");
    const { start, end } = monthBounds("2026-10");
    expect(start.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T15:00:00.000Z");
  });
});
