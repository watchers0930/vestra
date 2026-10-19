import { prisma } from "@/lib/prisma";
import { isTilkoAvailable, fetchRegistryCaseStatus } from "@/lib/tilko-api";
import { rateLimit } from "@/lib/rate-limit";
import { guestMonitoringEnabled, assertDecrypted } from "./config";
import { locked } from "./transaction";
import { buildSignalSummary } from "./signal-message";
export const GUEST_BATCH_SIZE = 15;
export async function runGuestPrechecks(now = new Date()) {
  if (!guestMonitoringEnabled()) return { processed: 0, failed: 0 };
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0);
  // Least recently checked first: remaining pages get a quota on every retry slot.
  // Retry predicates are model-local, so member/guest IDs cannot collide.
  const properties = await prisma.guestMonitoring.findMany({ where: {
    status: "active", paidUntil: { gt: now }, OR: [
      { lastCheckedAt: null }, { lastCheckedAt: { lt: windowStart } }, { registrySignalStatus: "error" },
    ],
  }, take: GUEST_BATCH_SIZE, orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
  select: { id: true, guestIdentityHash: true } });
  let processed = 0, failed = 0;
  for (const ref of properties) {
    const slot = Math.floor(now.getTime() / 600_000);
    const claim = await rateLimit(`guest-monitoring:precheck:${ref.id}:${slot}`, 1, 600_000);
    if (!claim.success) continue;
    // Re-read immediately before upstream call, including expiration and decryption checks.
    const property = await prisma.guestMonitoring.findFirst({ where: {
      id: ref.id, status: "active", paidUntil: { gt: new Date() },
    }, select: { commUniqueNo: true, ownerName: true, address: true, role: true } });
    if (!property) continue;
    let result = "fetch_failed";
    try {
      assertDecrypted(property.ownerName, property.address);
      if (!property.commUniqueNo || !isTilkoAvailable()) throw new Error("unavailable");
      const status = await fetchRegistryCaseStatus({ reqAddress: property.address,
        commUniqueNo: property.commUniqueNo, ownerName: property.ownerName });
      result = status.hasSignal ? "signal_detected" : "no_change";
    } catch { failed++; }
    await locked(ref.guestIdentityHash, async tx => {
      const checkedAt = new Date();
      const valid = await tx.guestMonitoring.updateMany({ where: {
        id: ref.id, status: "active", paidUntil: { gt: checkedAt },
      }, data: { lastCheckedAt: checkedAt,
        registrySignalStatus: result === "fetch_failed" ? "error" : result === "signal_detected" ? "signal_detected" : "idle",
        registrySignalSummary: buildSignalSummary(property.role, result),
        ...(result === "signal_detected" ? { registrySignalDetectedAt: checkedAt } : {}),
      } });
      if (valid.count) await tx.guestMonitoringCheckLog.create({ data: {
        guestMonitoringId: ref.id, checkedAt, method: "precheck", result,
        summary: buildSignalSummary(property.role, result), riskLevel: result === "signal_detected" ? "medium" : null,
      } });
    });
    processed++;
  }
  return { processed, failed };
}
