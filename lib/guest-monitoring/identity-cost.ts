import { guestLimit } from "./rate-limit-keys";

/** Reserve a global daily attempt immediately before the external identity call.
 * Do not refund failed calls: the provider may have accepted and billed them.
 */
export async function limitIdentityCost() {
  const configured = Number(process.env.GUEST_IDENTITY_DAILY_LIMIT || 100);
  const cap = Number.isInteger(configured) && configured > 0 ? Math.min(configured, 1000) : 100;
  await guestLimit("identity-cost", new Date().toISOString().slice(0, 10), cap, 86400_000);
}
