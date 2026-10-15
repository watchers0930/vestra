import { createHmac } from "node:crypto";
import { unavailable } from "@/lib/guest-monitoring/errors";
import { verifiedV1TestChannels } from "./portone-v1-test-channels";
export function resolvePaymentMode(): "mock" | "portone_v1" {
  const pay = process.env.GUEST_PAYMENT_MODE?.trim() || undefined;
  const dan = process.env.DANAL_PROVIDER?.trim() || undefined;
  if (pay && dan && pay !== dan) unavailable();
  const mode = pay ?? dan;
  if (mode === "portone_v1" || mode === "mock") return mode;
  return unavailable();
}
export function paymentSigningKey() {
  const secret = process.env.SEARCH_INDEX_KEY || process.env.AUTH_SECRET;
  if (!secret) return unavailable();
  return createHmac("sha256", secret).update("guest-monitoring/payment-callback/v1").digest();
}
export function getPortoneV1Config() {
  const impCode = process.env.NEXT_PUBLIC_PORTONE_V1_IMP_CODE?.trim();
  const restKey = process.env.PORTONE_V1_REST_API_KEY?.trim();
  const restSecret = process.env.PORTONE_V1_REST_API_SECRET?.trim();
  const mid = process.env.DANAL_MID?.trim();
  if (!impCode || !restKey || !restSecret || !mid) return unavailable();
  paymentSigningKey();
  const channel = verifiedV1TestChannels.find(c => c.impCode === impCode && c.mid === mid &&
    c.pgProvider === "danal_tpay" && c.payMethod === "card" && c.evidence.trim());
  if (!channel) return unavailable();
  return { impCode, restKey, restSecret, mid, pgProvider: channel.pgProvider, payMethod: channel.payMethod };
}
