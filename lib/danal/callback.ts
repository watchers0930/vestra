import { createHmac, timingSafeEqual } from "node:crypto";
import { GuestError, unavailable } from "@/lib/guest-monitoring/errors";
import type { CallbackEnvelope } from "./types";
function key() {
  const key = process.env.DANAL_MOCK_SECRET;
  if (!key || key.length < 32) unavailable();
  return key;
}
function sign(payload: string) { return createHmac("sha256", key()).update(payload).digest("hex"); }
/** Test fixture helper, never exposed by an HTTP endpoint. PII stays in signed POST bodies. */
export function signMockCallback(kind: "identity" | "payment", data: object): CallbackEnvelope {
  const payload = Buffer.from(JSON.stringify({ kind, ...data })).toString("base64url");
  return { payload, signature: sign(payload) };
}
export function verifyCallback(input: unknown, kind: "identity" | "payment"): Record<string, unknown> {
  const e = input as Partial<CallbackEnvelope> | null;
  if (!e || typeof e.payload !== "string" || e.payload.length > 8000 ||
      typeof e.signature !== "string" || !/^[a-f0-9]{64}$/.test(e.signature)) {
    throw new GuestError("verification_failed", 400);
  }
  if (!timingSafeEqual(Buffer.from(sign(e.payload), "hex"), Buffer.from(e.signature, "hex"))) {
    throw new GuestError("verification_failed", 400);
  }
  try {
    const value = JSON.parse(Buffer.from(e.payload, "base64url").toString());
    if (value.kind !== kind) throw new Error();
    return value;
  } catch { throw new GuestError("verification_failed", 400); }
}
