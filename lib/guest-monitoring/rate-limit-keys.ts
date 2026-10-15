import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/client-ip";
import { hashForSearch } from "@/lib/crypto";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { GuestError } from "./errors";
export async function guestLimit(scope: string, key: string, limit: number, windowMs = 60_000) {
  const result = await rateLimit(`guest-monitoring:${scope}:${hashForSearch(key)}`, limit, windowMs);
  if (!result.success) throw new GuestError("rate_limited", 429, rateLimitHeaders(result));
}
export function ipLimit(req: NextRequest, scope: string, limit: number, windowMs = 60_000) {
  return guestLimit(`ip:${scope}`, getClientIp(req), limit, windowMs);
}
