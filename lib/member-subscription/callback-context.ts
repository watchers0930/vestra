import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { SubscriptionOrder } from "@prisma/client";
import { fail } from "./errors";
const PURPOSE = "member_subscription_payment_v1";
function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return fail("provider_unavailable");
  return createHmac("sha256", secret).update("member_sub").digest();
}
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const sign = (v: string) => createHmac("sha256", signingKey()).update(v).digest("hex");
function equal(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
// A PRF-derived nonce can be reissued for the same order without storing its plaintext.
export function issueCallbackContext(order: Pick<SubscriptionOrder, "orderId" | "userId" | "expiresAt">) {
  const nonce = sign(`nonce:${order.orderId}:${order.userId}`);
  const callbackContext = Buffer.from(JSON.stringify({ purpose: PURPOSE, orderId: order.orderId,
    userId: order.userId, expiresAt: order.expiresAt.getTime(), nonce })).toString("base64url");
  return { callbackContext, callbackSignature: sign(callbackContext), callbackNonceHash: hash(nonce) };
}
const contextSchema = z.object({ purpose: z.literal(PURPOSE), orderId: z.string(), userId: z.string(),
  expiresAt: z.number().int(), nonce: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
export function verifyCallbackContext(order: SubscriptionOrder, context: string, signature: string,
  impUid: string, now = new Date()) {
  if (!equal(sign(context), signature)) fail("payment_failed");
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(context, "base64url").toString("utf8")); }
  catch { return fail("payment_failed"); }
  const parsed = contextSchema.safeParse(decoded);
  if (!parsed.success) return fail("payment_failed");
  const value = parsed.data;
  if (value.orderId !== order.orderId || value.userId !== order.userId ||
      value.expiresAt !== order.expiresAt.getTime() || !equal(hash(value.nonce), order.callbackNonceHash)) fail("payment_failed");
  const replay = order.nonceConsumedAt && order.providerTransactionId === impUid;
  if ((value.expiresAt <= now.getTime() || order.nonceConsumedAt) && !replay) fail("payment_failed");
}
