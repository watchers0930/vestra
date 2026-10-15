import { z } from "zod";
/** V1 OpenAPI PaymentAnnotation: pg_id is MID, timestamps are Unix seconds.
 * Keep only verification fields; discard buyer/card data at the REST boundary.
 * A sanitized Danal response must still be reviewed before opening the gate.
 */
export const impUidSchema = z.string().regex(/^imp_[0-9a-zA-Z]{1,40}$/);
export const iamportPaymentSchema = z.object({
  imp_uid: impUidSchema, merchant_uid: z.string().min(1).max(128),
  amount: z.number().finite(), currency: z.string().min(1), status: z.string().min(1),
  pg_provider: z.string().min(1), pg_id: z.string().min(1), pay_method: z.string().min(1),
  paid_at: z.number().int().nonnegative().optional(),
  cancel_amount: z.number().finite().nonnegative(),
  cancelled_at: z.number().int().nonnegative().optional(),
  cancel_history: z.array(z.object({ amount: z.number().finite().nonnegative(),
    cancelled_at: z.number().int().nonnegative() })).max(100).optional(),
  sandbox: z.boolean().optional(),
});
export type IamportPayment = z.infer<typeof iamportPaymentSchema>;
export const tokenSchema = z.object({ access_token: z.string().min(1),
  expired_at: z.number().int().positive(), now: z.number().int().positive() });
export const envelopeSchema = z.object({ code: z.number().int(), response: z.unknown() });
export const candidateSchema = z.object({ total: z.number().int().nonnegative(),
  next: z.number().int().nonnegative(), list: z.array(z.object({
    imp_uid: impUidSchema, merchant_uid: z.string().min(1),
  })).max(2) });
