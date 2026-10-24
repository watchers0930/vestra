import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export type SingleTransaction = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
/** 회원 단건의 모든 물건/주문 변이는 userId 단위 advisory lock으로 직렬화한다(만료 cron 포함).
 * READ COMMITTED로 lock 대기 후 직전 커밋을 관찰한다. 외부 부작용은 retries=0으로 재생 방지. */
export async function lockedSingle<T>(userId: string, run: (tx: SingleTransaction) => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`member-single:${userId}`}, 0))`;
        return run(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < retries) continue;
      throw e;
    }
  }
}
