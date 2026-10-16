import type { GuestIdentityStartRequest } from "@/types/guest-monitoring";
import { GuestError, notFound } from "./errors";
import { locked } from "./transaction";

/** Commit before contacting either identity provider. The role is immutable once selected. */
export async function bindDraftRole(identity: string, input: GuestIdentityStartRequest) {
  if (input.purpose !== "apply") return;
  if (!input.draftId) notFound();
  if (input.role !== "owner" && input.role !== "tenant") throw new GuestError("invalid_input");
  const role = input.role;
  await locked(identity, async tx => {
    const draft = await tx.guestMonitoring.findFirst({ where: {
      id: input.draftId, guestIdentityHash: identity, status: "pending_payment", draftExpiresAt: { gt: new Date() },
    }, select: { id: true, role: true } });
    if (!draft) notFound();
    if (draft.role === role) return;
    if (draft.role !== null) notFound();
    const order = await tx.guestMonitoringOrder.findFirst({ where: {
      guestMonitoringId: draft.id, status: { in: ["pending", "paid", "needs_review"] },
    }, select: { id: true } });
    if (order) notFound();
    await tx.guestMonitoring.update({ where: { id: draft.id }, data: { role } });
  });
}
