import { z } from "zod";
import { CHECKLIST_SCHEMA_VERSION } from "@/lib/jeonse/checklist-items";
import { normalizePropertyAddress } from "@/lib/registry/title-address-parser";
export const checklistAddressSchema = z.string().min(1).max(300)
  .transform(normalizePropertyAddress).refine(v => v.length > 0 && v.length <= 300);
export const checklistStateSchema = z.record(z.string().regex(/^(?:[0-9]|1[0-4])$/), z.boolean());
export const checklistInputSchema = z.object({
  address: checklistAddressSchema,
  schemaVersion: z.literal(CHECKLIST_SCHEMA_VERSION, { message: "버전 미지원" }),
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
  state: checklistStateSchema,
}); // 알려진 입력만 반환한다. 클라 userId/id/updatedAt은 무시한다.
