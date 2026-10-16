export function normalizeOwnerName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, "");
}
export function ownerNameMatches(guestName: string, ownerName: string) {
  return normalizeOwnerName(guestName) === normalizeOwnerName(ownerName);
}
