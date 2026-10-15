import { z } from "zod";
import { GuestError, unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneConfig } from "./portone-config";
/** A provider 404 can be propagation lag after SDK success, not a failed payment.
 * Keep it distinct for callers, but expose only a retryable, sanitized 503. */
export class PortonePaymentNotFound extends GuestError {
  constructor() { super("provider_unavailable", 503); }
}
const paymentSchema = z.object({
  id: z.string().min(1).max(128), storeId: z.string().min(1), status: z.string().min(1),
  transactionId: z.string().min(1).max(128).optional(),
  amount: z.object({ total: z.number().int().nonnegative() }), currency: z.string().min(1),
  paidAt: z.string().optional(),
  channel: z.object({ key: z.string().min(1), type: z.enum(["LIVE", "TEST"]), pgProvider: z.string().min(1) }).optional(),
  isForTest: z.boolean().optional(),
});
export type PortonePayment = z.infer<typeof paymentSchema>;
async function request(path: string, body?: object): Promise<unknown> {
  const { apiSecret } = getPortoneConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.portone.io${path}`, {
      method: body ? "POST" : "GET", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { Authorization: `PortOne ${apiSecret}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 404) throw new PortonePaymentNotFound();
    if (!response.ok) return unavailable();
    // Keep the abort active until JSON decoding completes as well.
    return await response.json();
  } catch (error) {
    if (error instanceof PortonePaymentNotFound) throw error;
    return unavailable();
  } finally { clearTimeout(timeout); }
}
export async function getPaymentById(paymentId: string): Promise<PortonePayment> {
  const { storeId } = getPortoneConfig();
  const value = await request(`/payments/${encodeURIComponent(paymentId)}?storeId=${encodeURIComponent(storeId)}`);
  const parsed = paymentSchema.safeParse(value);
  if (!parsed.success) return unavailable();
  return parsed.data;
}
export async function cancelPaymentById(paymentId: string) {
  const { storeId } = getPortoneConfig();
  const value = await request(`/payments/${encodeURIComponent(paymentId)}/cancel`, {
    storeId, reason: "Guest monitoring test payment cancellation", requester: "ADMIN",
  });
  const parsed = z.object({ cancellation: z.object({ status: z.string().min(1) }) }).safeParse(value);
  if (!parsed.success) return unavailable();
}
