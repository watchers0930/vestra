import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail } from "./errors";
export type MemberTransaction = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
/** All member writes serialize on the same user row. READ COMMITTED ensures
 * queries after waiting for that lock see the preceding payment/application. */
export async function memberTransaction<T>(userId: string, operation: (tx: MemberTransaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        return operation(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "P2034" && attempt < 2) continue;
      if (code === "P2002") fail("transaction_conflict");
      throw error;
    }
  }
  return fail("provider_unavailable");
}
