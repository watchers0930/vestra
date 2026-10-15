import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { resourceId } from "@/lib/guest-monitoring/schemas";
import { paymentSigningKey } from "./portone-config";
const nonce = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const receiptSchema = z.object({ v: z.literal(1), nonce, consumed: z.boolean() }).strict();
const contextSchema = z.object({
  v: z.literal(1), purpose: z.literal("guest_payment_v1"), paymentId: resourceId, orderId: resourceId,
  storeId: z.string().min(1).max(128), amount: z.number().int().positive(), currency: z.literal("KRW"),
  expiresAt: z.number().int().positive(), nonce,
}).strict();
export const callbackRequestSchema = z.object({
  paymentId: resourceId, callbackContext: z.string().min(1).max(4000).regex(/^[A-Za-z0-9_-]+$/),
  callbackSignature: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type CallbackContext = z.infer<typeof contextSchema>;
export type PortoneReceipt = z.infer<typeof receiptSchema>;
export function paymentFailed(): never { throw new GuestError("payment_failed", 400); }
export function encodeReceipt(receipt: PortoneReceipt) {
  return `portone_v1:${Buffer.from(JSON.stringify(receiptSchema.parse(receipt))).toString("base64url")}`;
}
export function newReceipt() { return encodeReceipt({ v: 1, nonce: randomBytes(32).toString("base64url"), consumed: false }); }
export function parseReceipt(value: string | null | undefined): PortoneReceipt {
  try {
    if (!value?.startsWith("portone_v1:") || value.length > 512) return paymentFailed();
    return receiptSchema.parse(JSON.parse(Buffer.from(value.slice(11), "base64url").toString("utf8")));
  } catch { return paymentFailed(); }
}
function signature(context: string) { return createHmac("sha256", paymentSigningKey()).update(context).digest("hex"); }
export function signCallbackContext(input: CallbackContext) {
  const c = contextSchema.parse(input);
  // Canonical key order is part of the browser/server contract.
  const callbackContext = Buffer.from(JSON.stringify({ v: c.v, purpose: c.purpose, paymentId: c.paymentId,
    orderId: c.orderId, storeId: c.storeId, amount: c.amount, currency: c.currency,
    expiresAt: c.expiresAt, nonce: c.nonce })).toString("base64url");
  return { callbackContext, callbackSignature: signature(callbackContext) };
}
export function verifyCallbackContext(input: unknown) {
  const request = callbackRequestSchema.safeParse(input);
  if (!request.success) return paymentFailed();
  const { callbackContext, callbackSignature, paymentId } = request.data;
  if (!timingSafeEqual(Buffer.from(signature(callbackContext), "hex"), Buffer.from(callbackSignature, "hex"))) return paymentFailed();
  try {
    const c = contextSchema.parse(JSON.parse(Buffer.from(callbackContext, "base64url").toString("utf8")));
    if (c.paymentId !== paymentId || c.orderId !== paymentId) return paymentFailed();
    return c;
  } catch { return paymentFailed(); }
}
