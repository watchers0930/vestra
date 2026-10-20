import { z } from "zod";
import type { DurationMonths } from "@/types/member-subscription";
export const resourceId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const orderIdSchema = z.string().max(128).regex(/^msub_[a-zA-Z0-9_-]+$/);
// V2: 결제 식별자 = paymentId(= orderId, msub_...). 콜백/복구의 `imp_uid` 필드는 하위호환 필드명이나
// 값은 paymentId를 운반한다(설계 §5.1). 따라서 orderIdSchema와 동일 포맷만 허용한다.
export const impUidSchema = orderIdSchema;
const plan = z.enum(["PRO", "PREMIUM"]);
export const orderSchema = z.object({
  purpose: z.enum(["initial", "renewal"]), plan,
  durationMonths: z.number().int().refine(v => [1, 3, 6, 9, 12, 24].includes(v), { message: "invalid_duration" }).transform(v => v as DurationMonths),
  productKind: z.enum(["standard", "paid_trial"]),
  idempotencyKey: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
}).strict()
  .refine(v => v.productKind !== "paid_trial" || (v.plan === "PRO" && v.durationMonths === 1));
export const callbackSchema = z.object({
  paymentId: orderIdSchema, imp_uid: impUidSchema,
  callbackContext: z.string().min(1).max(2048).regex(/^[A-Za-z0-9_-]+$/),
  callbackSignature: z.string().regex(/^[0-9a-f]{64}$/),
}).strict()
  // V2는 식별자가 단일(paymentId=imp_uid). 두 값이 다르면 위변조·혼선으로 보고 거부한다.
  .refine(v => v.imp_uid === v.paymentId, { message: "payment_id_mismatch" });
export const recoverSchema = z.object({ imp_uid: impUidSchema.optional() }).strict();
export const trialSchema = z.object({ plan }).strict();
