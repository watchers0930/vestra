import { assertDecrypted } from "./config";
import { GuestError } from "./errors";
import { ownerNameMatches } from "./owner-match";

export function assertApplicantRole(property: { role: string | null; guestName: string; ownerName: string | null }) {
  if (property.role !== "owner" && property.role !== "tenant") throw new GuestError("invalid_input");
  if (property.role === "owner") {
    assertDecrypted(property.guestName, property.ownerName);
    if (!ownerNameMatches(property.guestName, property.ownerName!)) throw new GuestError("owner_name_mismatch", 403);
  }
}
