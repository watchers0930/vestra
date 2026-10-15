import { createHmac } from "node:crypto";
import { unavailable } from "@/lib/guest-monitoring/errors";
import { verifiedTestChannels } from "./portone-test-channels";
export function resolvePaymentMode(): "mock" | "portone" {
  const pay = process.env.GUEST_PAYMENT_MODE?.trim() || undefined;
  const dan = process.env.DANAL_PROVIDER?.trim() || undefined;
  if (pay && dan && pay !== dan) unavailable();
  const mode = pay ?? dan;
  if (mode === "portone" || mode === "mock") return mode;
  return unavailable();
}
export function paymentSigningKey() {
  const secret = process.env.SEARCH_INDEX_KEY || process.env.AUTH_SECRET;
  if (!secret) return unavailable();
  return createHmac("sha256", secret).update("guest-monitoring/payment-callback/v1").digest();
}
export function getPortoneConfig() {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL?.trim();
  const apiSecret = process.env.PORTONE_V2_API_SECRET?.trim();
  if (!storeId || !channelKey || !apiSecret) return unavailable();
  paymentSigningKey();
  const channel = verifiedTestChannels.find(c => c.storeId === storeId && c.channelKey === channelKey);
  if (!channel?.evidence || !channel.payMethod || !channel.pgProvider) return unavailable();
  return { storeId, channelKey, apiSecret, payMethod: channel.payMethod, pgProvider: channel.pgProvider };
}
