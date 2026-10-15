import { hashForSearch } from "@/lib/crypto";
import { requireCrypto } from "./config";
export function normalizeGuestName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}
export function normalizeGuestPhone(value: string) {
  return value.replace(/[\s()-]/g, "").replace(/^\+82/, "0");
}
export function guestIdentityHash(name: string, phone: string) {
  requireCrypto();
  return hashForSearch(JSON.stringify([normalizeGuestName(name), normalizeGuestPhone(phone)]));
}
