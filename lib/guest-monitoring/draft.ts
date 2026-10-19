import { prisma } from "@/lib/prisma";
import { validateMagicBytes } from "@/lib/sanitize";
import { applicantSchema } from "./schemas";
import { GuestError } from "./errors";
import { guestIdentityHash } from "./identity-hash";
import { DRAFT_TTL } from "./config";
import { extractGuestPDF, extractRegistryFields } from "./pdf-extraction";
export async function createDraft(form: FormData) {
  if ([...form.keys()].some(k => !["file", "guestName", "guestPhone"].includes(k)) ||
      [...form.keys()].some(k => form.getAll(k).length !== 1)) throw new GuestError("invalid_input");
  const parsed = applicantSchema.safeParse(Object.fromEntries(["guestName", "guestPhone"].map(k => [k, form.get(k)])));
  if (!parsed.success) throw new GuestError("invalid_input");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) throw new GuestError("invalid_pdf");
  if (file.size > 10 * 1024 * 1024) throw new GuestError("file_too_large", 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(buffer, "application/pdf")) throw new GuestError("invalid_pdf");
  const fields = extractRegistryFields(await extractGuestPDF(buffer));
  const draftExpiresAt = new Date(Date.now() + DRAFT_TTL);
  const draft = await prisma.guestMonitoring.create({ data: {
    guestName: parsed.data.guestName, guestPhone: parsed.data.guestPhone,
    guestIdentityHash: guestIdentityHash(parsed.data.guestName, parsed.data.guestPhone),
    commUniqueNo: fields.commUniqueNo, ownerName: fields.ownerName, address: fields.address, draftExpiresAt,
  }, select: { id: true } });
  return { draftId: draft.id, address: fields.address, unitNumber: fields.unitNumber,
    commUniqueNoMasked: fields.commUniqueNo.slice(0, 4) + "-****-******",
    ownerNameMasked: fields.ownerName.slice(0, 1) + "**", extractionOk: true,
    draftExpiresAt: draftExpiresAt.toISOString() };
}
