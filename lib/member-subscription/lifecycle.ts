import type { Subscription } from "@prisma/client";
import type { SubStatus } from "@/types/member-subscription";
export const DAY_MS = 86_400_000;
/** Calendar months in Asia/Seoul, clamped at month end; independent of host TZ. */
export function addCalendarMonths(start: Date, months: number): Date {
  if (!Number.isInteger(months) || months <= 0) throw new RangeError("Invalid months");
  const offset = 9 * 3_600_000;
  const local = new Date(start.getTime() + offset);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + months);
  const last = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, last));
  return new Date(local.getTime() - offset);
}
export function subscriptionState(sub: Subscription | null, business: boolean, grandfathered: boolean, now = new Date()): {
  status: SubStatus; graceEndsAt: Date | null; lockedAt: Date | null;
} {
  if (!sub) return { status: "active", graceEndsAt: null, lockedAt: null };
  // Unclassified legacy subscriptions never acquire new expiration restrictions.
  if (!sub.policyVersion) {
    return { status: sub.status === "canceled" ? "canceled" : "active", graceEndsAt: null, lockedAt: null };
  }
  if (sub.status === "canceled") return { status: "canceled", graceEndsAt: null, lockedAt: null };
  const end = sub.status === "trialing" ? sub.trialEndsAt : sub.endDate;
  if (!end || end > now) return { status: sub.status === "trialing" ? "trialing" : "active", graceEndsAt: null, lockedAt: null };
  if (!business || grandfathered) return { status: "expired", graceEndsAt: null, lockedAt: null };
  const graceEndsAt = new Date(end.getTime() + 7 * DAY_MS);
  return { status: now < graceEndsAt ? "grace" : "locked", graceEndsAt, lockedAt: now >= graceEndsAt ? graceEndsAt : null };
}
export function paidPeriod(sub: Subscription | null, months: number, now = new Date()) {
  const start = sub?.status !== "trialing" && sub?.endDate && sub.endDate > now ? sub.endDate : now;
  return { start, end: addCalendarMonths(start, months) };
}
