import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyCallback } from "./callback";
import { GuestError } from "@/lib/guest-monitoring/errors";
import type { DanalProvider, PaymentResult } from "./types";
const identitySchema = z.object({
  nonce: z.string().min(32).max(128), transactionId: z.string().min(1).max(128),
  guestName: z.string().min(2).max(80), guestPhone: z.string().min(8).max(30),
  approved: z.boolean(), expiresAt: z.number().int(),
});
const paymentSchema = z.object({
  orderId: z.string().min(1).max(128), transactionId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  merchantId: z.string(), amount: z.number().int(), currency: z.string(),
  paidAt: z.number().int(),
  status: z.enum(["paid", "failed", "canceled", "refunded"]), expiresAt: z.number().int(),
});
/** Signed mock receipt is a durable server fixture, independent of browser success flags.
 * Receipt carries payment fields only; no identity PII. Production cannot select this adapter.
 */
function decodePayment(input: unknown): PaymentResult {
  const parsed = paymentSchema.safeParse(verifyCallback(input, "payment"));
  if (!parsed.success) throw new GuestError("payment_failed", 400);
  return parsed.data;
}
export const mockProvider: DanalProvider = {
  mode: "mock", merchantId: "guest-isolated-mock",
  identity: {
    async startVerification({ nonce }) { return { provider: "mock", state: nonce }; },
    async verifyResult(input) {
      const result = identitySchema.safeParse(verifyCallback(input, "identity"));
      if (!result.success || result.data.expiresAt <= Date.now()) throw new GuestError("verification_failed", 400);
      return result.data;
    },
  },
  payment: {
    async createPayment({ orderId }) { return { provider: "mock", orderId }; },
    async verifyPayment(input) {
      const value = decodePayment(input);
      const envelope = input as { payload: string; signature: string };
      // Store the signed server receipt, not an untrusted browser transaction claim.
      return { ...value, verificationReference: `${envelope.payload}.${envelope.signature}` };
    },
    async getPayment(reference) {
      const receipt = reference.includes(".") ? reference : (await prisma.guestMonitoringOrder.findUnique({
        where: { providerTransactionId: reference }, select: { providerReceipt: true },
      }))?.providerReceipt;
      if (!receipt) throw new GuestError("payment_failed", 400);
      const [payload, signature, extra] = receipt.split(".");
      if (extra || !payload || !signature) throw new GuestError("payment_failed", 400);
      const result = decodePayment({ payload, signature });
      return { ...result, verificationReference: receipt };
    },
    async cancelPayment() { throw new GuestError("provider_unavailable", 503); },
  },
};
