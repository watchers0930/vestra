import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashForSearch } from "@/lib/crypto";
import { CHECKLIST_SCHEMA_VERSION, type JeonseChecklistDTO } from "./checklist-items";
import { checklistStateSchema } from "@/schemas/jeonse-checklist";
import { normalizePropertyAddress } from "@/lib/registry/title-address-parser";

type Input = { address: string; state: Record<string, boolean>; schemaVersion: number; expectedRevision: number };
type Stored = { address: string; state: unknown; schemaVersion: number; revision: number; updatedAt: Date };
const select = { address: true, state: true, schemaVersion: true, revision: true, updatedAt: true } as const;
export const checklistPersistenceEnabled = () => process.env.JEONSE_CHECKLIST_ENABLED === "true";
export function checklistDTO(address: string, row: Stored | null): JeonseChecklistDTO {
  if (row?.address.startsWith("v2:")) throw new Error("checklist_decryption_failed");
  return row ? { address: row.address, state: checklistStateSchema.parse(row.state), schemaVersion: row.schemaVersion,
    revision: row.revision, updatedAt: row.updatedAt.toISOString() }
    : { address, state: {}, schemaVersion: CHECKLIST_SCHEMA_VERSION, revision: 0, updatedAt: null };
}
export async function getChecklist(userId: string, address: string) {
  const normalized = normalizePropertyAddress(address);
  const addressKey = hashForSearch(normalized);
  const row = await prisma.jeonseChecklist.findUnique({ where: { userId_addressKey: { userId, addressKey } }, select });
  return checklistDTO(normalized, row);
}
export async function saveChecklist(userId: string, input: Input) {
  const addressKey = hashForSearch(input.address);
  const where = { userId_addressKey: { userId, addressKey } };
  try {
    return await prisma.$transaction(async tx => {
      const data = { address: input.address, state: input.state, schemaVersion: input.schemaVersion };
      if (input.expectedRevision === 0) {
        const row = await tx.jeonseChecklist.create({ data: { ...data, userId, addressKey }, select });
        await tx.auditLog.create({ data: { userId, action: "JEONSE_CHECKLIST_SAVED" } });
        return { conflict: false, dto: checklistDTO(input.address, row) };
      }
      const changed = await tx.jeonseChecklist.updateMany({
        where: { userId, addressKey, revision: input.expectedRevision },
        data: { ...data, revision: { increment: 1 } },
      });
      const latest = await tx.jeonseChecklist.findUnique({ where, select });
      if (changed.count === 1) await tx.auditLog.create({ data: { userId, action: "JEONSE_CHECKLIST_SAVED" } });
      // 조회도 같은 트랜잭션에서 하므로 다른 revision의 성공 응답으로 바뀌지 않는다.
      return { conflict: changed.count === 0, dto: checklistDTO(input.address, latest) };
    });
  } catch (error) {
    // 생성 unique 경합: 트랜잭션 롤백 후 최신 본인 상태만 반환한다.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { conflict: true, dto: await getChecklist(userId, input.address) };
    }
    throw error;
  }
}
