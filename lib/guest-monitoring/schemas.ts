import { z } from "zod";
import { normalizeGuestName, normalizeGuestPhone } from "./identity-hash";
export const resourceId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const otpVerifySchema = z.object({
  verificationId: resourceId,
  code: z.string().regex(/^[0-9]{6}$/),
}).strict();
const name = z.string().max(100).transform(normalizeGuestName)
  .pipe(z.string().min(2).max(80).regex(/^[\p{L}\p{M} .'-]+$/u));
const phone = z.string().max(30).transform(normalizeGuestPhone)
  .pipe(z.string().regex(/^01[016789]\d{7,8}$/));
export const applicantSchema = z.object({
  guestName: name, guestPhone: phone,
}).strict();
export const identityStartSchema = z.object({
  purpose: z.enum(["apply", "status", "renewal"]),
  guestName: name, guestPhone: phone, draftId: resourceId.optional(),
  role: z.enum(["owner", "tenant"]).optional(),
}).strict().refine(v => v.purpose === "apply" ? !!v.draftId && !!v.role : !v.draftId && !v.role);
export const orderSchema = z.object({
  purpose: z.enum(["initial", "renewal"]), draftId: resourceId.optional(),
  guestMonitoringId: resourceId.optional(), idempotencyKey: z.string().uuid(),
}).strict().refine(v => v.purpose === "initial" ? !!v.draftId && !v.guestMonitoringId : !!v.guestMonitoringId && !v.draftId);
export const monthSchema = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/);
