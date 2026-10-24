import { prisma } from "@/lib/prisma";
import { lockedSingle } from "./transaction";

/** 만료된 단건 물건(paidUntil<=now)을 expired로 전환. 조건부 update로 lock 대기 중 연장된 건은 건너뜀.
 * registry-monitor cron 초반에 호출. 지연돼도 크론 물건단위 필터의 paidUntil>now로 감시는 안 돈다(이중 안전). */
export async function expireSingleProperties(now = new Date()): Promise<{ expired: number }> {
  const due = await prisma.monitoredProperty.findMany({
    where: { source: "single", status: "active", paidUntil: { lte: now } },
    select: { id: true, userId: true }, take: 100,
  });
  let expired = 0;
  for (const p of due) {
    const r = await lockedSingle(p.userId, async tx =>
      tx.monitoredProperty.updateMany({
        where: { id: p.id, source: "single", status: "active", paidUntil: { lte: now } },
        data: { status: "expired" },
      }),
    );
    expired += r.count;
  }
  return { expired };
}
