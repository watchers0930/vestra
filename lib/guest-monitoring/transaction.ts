import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export type GuestTransaction = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
/** All property/order mutations use the same identity lock, including cron expiry.
 * READ COMMITTED ensures reads after waiting on the lock see a just-committed renewal.
 * External side effects must pass retries=0 to avoid replay after a commit failure.
 */
export async function locked<T>(identity: string, run: (tx: GuestTransaction) => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`guest:${identity}`}, 0))`;
        return run(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < retries) continue;
      throw e;
    }
  }
}
