import { prisma } from "@/lib/prisma";

/** Preserve member retry semantics: only the latest failed check in this hour. */
export async function memberRetryTargetIds(now: Date) {
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0); // 이번 시간대 시작(:00)
  const recent = await prisma.monitoringCheckLog.findMany({
    where: { checkedAt: { gte: windowStart } },
    orderBy: { checkedAt: "desc" },
    select: { monitoredPropertyId: true, result: true },
  });
  const latest = new Map<string, string>();
  for (const r of recent) {
    if (!latest.has(r.monitoredPropertyId)) latest.set(r.monitoredPropertyId, r.result);
  }
  return [...latest.entries()]
    .filter(([, res]) => res === "fetch_failed")
    .map(([id]) => id);
}
