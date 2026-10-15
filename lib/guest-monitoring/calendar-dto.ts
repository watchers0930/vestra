import type { GuestMonitoring } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GuestPropertyDto, GuestCalendarResponse } from "@/types/guest-monitoring";
import { assertDecrypted } from "./config";
import { notFound } from "./errors";
import { monthBounds } from "./period";
const propertySelect = { id: true, address: true, status: true, startedAt: true, paidUntil: true } as const;
type Property = Pick<GuestMonitoring, keyof typeof propertySelect>;
export function propertyDto(property: Property): GuestPropertyDto {
  assertDecrypted(property.address);
  if (!property.startedAt || !property.paidUntil) notFound();
  return { id: property.id, addressShort: property.address.split(/\s+/).slice(0, 3).join(" "),
    status: property.paidUntil > new Date() ? "active" : "expired",
    startedAt: property.startedAt.toISOString(), paidUntil: property.paidUntil.toISOString() };
}
export async function listProperties(identity: string) {
  const properties = await prisma.guestMonitoring.findMany({ where: {
    guestIdentityHash: identity, status: { in: ["active", "expired"] }, startedAt: { not: null }, paidUntil: { not: null },
  }, select: propertySelect, orderBy: { createdAt: "desc" } });
  return { properties: properties.map(propertyDto) };
}
/** Only fixed server-owned summaries are emitted; upstream text is never returned. */
export function safeSummary(result: string) {
  const summaries: Record<string, string> = {
    no_change: "등기신청 사건 없음 — 이상 없음",
    signal_detected: "등기신청 사건이 감지되었습니다. 최신 등기부를 확인해주세요.",
    fetch_failed: "감시 조회에 실패했습니다. 다음 주기에 재시도합니다.",
    needs_registration: "등기부 PDF를 다시 등록해주세요.",
  };
  return summaries[result] || null;
}
export async function getCalendar(identity: string, id: string, month: string): Promise<GuestCalendarResponse> {
  const property = await prisma.guestMonitoring.findFirst({ where: {
    id, guestIdentityHash: identity, status: { in: ["active", "expired"] },
  }, select: propertySelect });
  if (!property?.startedAt || !property.paidUntil) notFound();
  const { start, end } = monthBounds(month);
  // Query paid intervals to omit any gaps following expiry/reactivation.
  const periods = await prisma.guestMonitoringOrder.findMany({ where: {
    guestMonitoringId: id, status: "paid", appliedAt: { not: null },
    appliedPeriodStart: { lt: end }, appliedPeriodEnd: { gt: start },
  }, select: { appliedPeriodStart: true, appliedPeriodEnd: true } });
  const intervals = periods.flatMap(p => p.appliedPeriodStart && p.appliedPeriodEnd ? [{ checkedAt: {
    gte: new Date(Math.max(start.getTime(), p.appliedPeriodStart.getTime())),
    lt: new Date(Math.min(end.getTime(), p.appliedPeriodEnd.getTime())),
  } }] : []);
  const logs = intervals.length ? await prisma.guestMonitoringCheckLog.findMany({ where: {
    guestMonitoringId: id, OR: intervals,
  }, select: { id: true, checkedAt: true, method: true, result: true, riskLevel: true },
  orderBy: { checkedAt: "asc" } }) : [];
  return { property: propertyDto(property), month, logs: logs.map(log => ({ ...log,
    checkedAt: log.checkedAt.toISOString(), summary: safeSummary(log.result) })) };
}
