import { GuestError } from "./errors";
export function guestMonitoringEnabled() {
  return process.env.GUEST_MONITORING_ENABLED === "true";
}
export function requireEnabled() {
  if (!guestMonitoringEnabled()) throw new GuestError("not_found", 404);
}
export function requireCrypto() {
  if (!process.env.PII_ENCRYPTION_KEY || !process.env.PII_SALT ||
      !(process.env.SEARCH_INDEX_KEY || process.env.AUTH_SECRET)) {
    throw new GuestError("provider_unavailable", 503);
  }
}
export function assertDecrypted(...values: (string | null)[]) {
  requireCrypto();
  if (values.some(v => !v || /^v\d+:/.test(v))) throw new GuestError("provider_unavailable", 503);
}
export const DRAFT_TTL = 30 * 60_000;
export const SESSION_TTL = 15 * 60_000;
export const ORDER_TTL = 20 * 60_000;
