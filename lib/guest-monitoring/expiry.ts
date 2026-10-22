import { prisma } from "@/lib/prisma";
import { locked } from "./transaction";
import { recoverPayments } from "./recovery";
import { deliverOutbox } from "./outbox";
import { cleanupGuestData } from "./cleanup";
/** 만료 7일 전 업셀 알림 윈도우. */
const PRE_EXPIRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** 만료 임박(7일 내) 물건에 pre_expiry 업셀 메시지 생성(발송은 outbox). status는 유지. */
async function warnExpiringProperties(now: Date) {
  const soon = new Date(now.getTime() + PRE_EXPIRY_WINDOW_MS);
  const expiring = await prisma.guestMonitoring.findMany({ where: {
    status: "active", paidUntil: { gt: now, lte: soon },
  }, select: { id: true, guestIdentityHash: true }, take: 100, orderBy: { paidUntil: "asc" } });
  for (const ref of expiring) await locked(ref.guestIdentityHash, async tx => {
    const property = await tx.guestMonitoring.findFirst({ where: {
      id: ref.id, status: "active", paidUntil: { gt: now, lte: soon },
    }, select: { paidUntil: true } });
    if (!property?.paidUntil) return;
    // unique([guestMonitoringId, type, targetPaidUntil])로 같은 만료주기엔 1건만(매일 cron 재실행해도 중복 없음).
    await tx.guestMonitoringMessage.upsert({ where: { guestMonitoringId_type_targetPaidUntil: {
      guestMonitoringId: ref.id, type: "pre_expiry", targetPaidUntil: property.paidUntil,
    } }, create: { guestMonitoringId: ref.id, type: "pre_expiry", targetPaidUntil: property.paidUntil,
      nextAttemptAt: now }, update: {} });
  });
  return expiring.length;
}

/** Bounded sweeps; conditional updates never overwrite a newer paidUntil. */
async function expireProperties(now: Date) {
  const expired = await prisma.guestMonitoring.findMany({ where: {
    status: "active", paidUntil: { lte: now },
  }, select: { id: true, guestIdentityHash: true }, take: 100, orderBy: { paidUntil: "asc" } });
  for (const ref of expired) await locked(ref.guestIdentityHash, async tx => {
    const property = await tx.guestMonitoring.findFirst({ where: {
      id: ref.id, status: "active", paidUntil: { lte: now },
    }, select: { paidUntil: true } });
    if (!property?.paidUntil) return;
    await tx.guestMonitoring.update({ where: { id: ref.id }, data: { status: "expired" } });
    await tx.guestMonitoringMessage.upsert({ where: { guestMonitoringId_type_targetPaidUntil: {
      guestMonitoringId: ref.id, type: "expiry_notice", targetPaidUntil: property.paidUntil,
    } }, create: { guestMonitoringId: ref.id, type: "expiry_notice", targetPaidUntil: property.paidUntil,
      nextAttemptAt: now }, update: {} });
  });
  return expired.length;
}
export async function runGuestLifecycle(now = new Date()) {
  // Recover first so already-paid renewals do not trigger stale expiry notices.
  const recovered = await recoverPayments();
  const warned = await warnExpiringProperties(now);
  const expired = await expireProperties(now);
  const sent = await deliverOutbox(now);
  const abandoned = await cleanupGuestData(now);
  return { expired, warned, sent, recovered, abandoned };
}
