import { prisma } from "@/lib/prisma";
import { prepareSms, findSmsReceipt } from "@/lib/solapi-client";
import { locked, type GuestTransaction } from "./transaction";
import { assertDecrypted } from "./config";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 10 * 60_000;
async function alert(tx: GuestTransaction, id: string) {
  await tx.auditLog.create({ data: { action: "GUEST_SMS_NEEDS_REVIEW", target: id,
    detail: JSON.stringify({ reason: "delivery_exhausted_or_unknown" }) } });
  console.error("[GuestMonitoring] sms_reconciliation_required", { messageId: id });
}
export async function deliverOutbox(now: Date) {
  const messages = await prisma.guestMonitoringMessage.findMany({ where: { OR: [
    { status: { in: ["pending", "failed"] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    { status: { in: ["preparing", "dead"] }, nextAttemptAt: { lte: now } },
  ] }, select: { id: true, guestMonitoringId: true, type: true, targetPaidUntil: true, attempts: true, status: true, createdAt: true },
  take: 50, orderBy: { createdAt: "asc" } });
  let sent = 0;
  for (const message of messages) {
    const reconcile = message.status === "dead";
    const attempt = message.attempts + 1;
    const lease = new Date(now.getTime() + RETRY_DELAY);
    const nextAttemptAt = attempt < MAX_ATTEMPTS ? lease : null;
    // A crashed preparation lease can send again; only a durable send marker is query-only.
    const claimed = await prisma.guestMonitoringMessage.updateMany({ where: {
      id: message.id, status: message.status, attempts: message.attempts,
    }, data: { status: reconcile ? "dead" : "preparing", attempts: { increment: 1 }, nextAttemptAt: lease } });
    if (!claimed.count) continue;
    try {
      const ref = await prisma.guestMonitoring.findUniqueOrThrow({ where: { id: message.guestMonitoringId },
        select: { guestIdentityHash: true } });
      const delivered = await locked(ref.guestIdentityHash, async tx => {
        if (message.attempts >= MAX_ATTEMPTS) {
          await tx.guestMonitoringMessage.update({ where: { id: message.id }, data: { status: "dead", nextAttemptAt: null } });
          await alert(tx, message.id);
          return false;
        }
        // pre_expiry(만료 전 업셀)는 물건이 아직 active이고 해당 주기가 유지될 때만 발송.
        // 연장되면 paidUntil이 바뀌어 targetPaidUntil 불일치 → 발송 안 함(올바름). expiry_notice는 만료 후.
        const isPre = message.type === "pre_expiry";
        const property = await tx.guestMonitoring.findFirst({ where: isPre ? {
          id: message.guestMonitoringId, status: "active", paidUntil: message.targetPaidUntil,
        } : {
          id: message.guestMonitoringId, status: "expired", paidUntil: message.targetPaidUntil,
          AND: { paidUntil: { lte: new Date() } },
        }, select: { guestPhone: true } });
        if (!property) {
          await tx.guestMonitoringMessage.update({ where: { id: message.id }, data: { status: "dead", nextAttemptAt: null } });
          return false;
        }
        assertDecrypted(property.guestPhone);
        if (reconcile) {
          const receipt = await findSmsReceipt(property.guestPhone, message.id, message.createdAt);
          await tx.guestMonitoringMessage.update({ where: { id: message.id }, data: receipt ? {
            status: "sent", providerMessageId: receipt, channel: "sms", sentAt: new Date(), nextAttemptAt: null,
          } : { nextAttemptAt } });
          if (!receipt && !nextAttemptAt) await alert(tx, message.id);
          return !!receipt;
        }
        const send = await prepareSms(property.guestPhone,
          isPre
            ? "[VESTRA] 등기감시가 곧 만료됩니다. 지금 연장하면 끊김 없이 등기 변동을 계속 감시합니다. 물건 1건 / 1개월 / 10,000원. 본인인증 후 연장: https://vestra.ai.kr/renewal/monitoring/guest/status"
            : "[VESTRA] 등기감시 이용기간이 만료되었습니다. 연장: 물건 1건 / 1개월 / 총 10,000원. 본인인증 후 조회·연장: https://vestra.ai.kr/renewal/monitoring/guest/status",
          { correlationId: message.id });
        // Commit outside the transaction BEFORE external I/O, so a rollback cannot erase it.
        // A crash between this marker and send is inherently ambiguous: reconcile, never resend.
        const marked = await prisma.guestMonitoringMessage.updateMany({ where: {
          id: message.id, status: "preparing", attempts: attempt,
        }, data: { status: "dead" } });
        if (!marked.count) return false;
        const result = await send();
        const success = result.success && (result.channel === "sms" || process.env.NODE_ENV !== "production");
        const retryable = result.retryable || result.channel === "sms_mock";
        await tx.guestMonitoringMessage.update({ where: { id: message.id }, data: {
          status: success ? "sent" : retryable && nextAttemptAt ? "failed" : "dead", channel: result.channel,
          providerMessageId: result.providerMessageId || null, sentAt: success ? new Date() : null,
          nextAttemptAt: success ? null : nextAttemptAt,
        } });
        if (!success && !nextAttemptAt) await alert(tx, message.id);
        return success;
      }, 0); // External sends must never replay on transaction failure.
      if (delivered) sent++;
    } catch {
      // A preparation error leaves the lease retryable. A send marker remains query-only.
      if (!nextAttemptAt) {
        const stopped = await prisma.guestMonitoringMessage.updateMany({ where: {
          id: message.id, attempts: attempt, status: { in: ["preparing", "dead"] },
        }, data: { status: "dead", nextAttemptAt: null } });
        if (stopped.count) await alert(prisma, message.id);
      }
      console.error("[GuestMonitoring] sms_delivery_pending", { messageId: message.id });
    }
  }
  return sent;
}
