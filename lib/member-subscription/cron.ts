import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { memberTransaction } from "./transaction";
import { settleMemberOrder } from "./payment-callback";
import { subscriptionState, DAY_MS } from "./lifecycle";
import { effectiveEntitlement, BUSINESS_ROLES } from "./policy";
import { memberReleaseConfig } from "./config";
import { MemberError } from "./errors";
import { markNeedsReview } from "./record-payment";
const BATCH_SIZE = 100;
export async function runMemberLifecycle() {
  const { policyVersion } = memberReleaseConfig();
  const result = { recovered: 0, expired: 0, locked: 0, notified: 0 };
  const paid = await prisma.subscriptionOrder.findMany({ where: { status: "paid", appliedAt: null },
    orderBy: { updatedAt: "asc" }, take: BATCH_SIZE });
  for (const order of paid) {
    try {
      // Re-verify with the PG before granting a term: a paid order may have been
      // refunded/canceled in the window between record and activation (settleMemberOrder
      // with reverify marks it reversed and refuses activation instead of granting access).
      if (!order.providerTransactionId) { await markNeedsReview(order); continue; }
      await settleMemberOrder(order, true);
      result.recovered++;
    }
    catch (error) {
      if (error instanceof MemberError && ["payment_needs_review", "plan_change_not_allowed", "plan_not_allowed", "verification_required"].includes(error.code)) {
        await markNeedsReview(order);
      }
      // Retain paid records on transient failure; no raw exception/PII in logs.
      await prisma.subscriptionOrder.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
    }
  }
  const now = new Date();
  const due = await prisma.subscription.findMany({ where: { policyVersion,
    endDate: { lte: new Date(now.getTime() + 3 * DAY_MS) }, status: { in: ["active", "trialing", "grace", "expired", "locked"] },
  }, orderBy: { updatedAt: "asc" }, take: BATCH_SIZE, select: { userId: true } });
  for (const item of due) {
    const counts = await memberTransaction(item.userId, async tx => {
      const sub = await tx.subscription.findUnique({ where: { userId: item.userId } });
      const user = await tx.user.findUnique({ where: { id: item.userId }, select: { id: true, role: true, verifyStatus: true, membershipPolicy: true } });
      if (!sub?.endDate || !user?.membershipPolicy) return null;
      const state = subscriptionState(sub, BUSINESS_ROLES.includes(user.role), !!user.membershipPolicy.grandfatheredAt, now);
      const expired = ["expired", "grace", "locked"].includes(state.status) && ["active", "trialing"].includes(sub.status);
      const locked = state.status === "locked" && sub.status !== "locked";
      await tx.subscription.update({ where: { id: sub.id }, data: { status: state.status,
        graceEndsAt: state.graceEndsAt, lockedAt: state.lockedAt, updatedAt: now } });
      const entitlement = effectiveEntitlement({ ...user, subscription: sub }, now);
      const activeCount = await tx.monitoredProperty.count({ where: { userId: item.userId, status: "active" } });
      if (!entitlement.grandfathered && !entitlement.canUsePaidFeatures) {
        // Expired/locked classified member (limit 0): pause ALL monitoring so the shared
        // registry-monitor batch (status:active, take+lastCheckedAt order) naturally excludes
        // them. Without this, post-filtered items keep their stale lastCheckedAt and re-occupy
        // the batch front every run, starving legitimate paid members. Grandfathered/legacy
        // owners are never paused (they keep their preserved rights).
        if (activeCount > 0) await tx.monitoredProperty.updateMany({ where: { userId: item.userId, status: "active" }, data: { status: "paused" } });
      } else if (entitlement.monitoringLimit > 0 && activeCount > entitlement.monitoringLimit) {
        await tx.monitoredProperty.updateMany({ where: { userId: item.userId, status: "active" }, data: { status: "paused" } });
      }
      const ended = sub.endDate <= now;
      const id = "msub_notice_" + createHash("sha256").update(`${sub.id}:${sub.endDate.toISOString()}:${ended ? "expired" : "upcoming"}`).digest("hex");
      const notice = await tx.notification.createMany({ skipDuplicates: true, data: [{ id, userId: item.userId,
        type: "system", title: ended ? "회원 구독 기간이 종료되었습니다" : "회원 구독 만료 예정 안내",
        body: "마이페이지에서 이용 기간과 재구독 정보를 확인해 주세요.", data: { source: "member_subscription", event: ended ? "expired" : "upcoming" },
      }] });
      return { expired: Number(expired), locked: Number(locked), notified: notice.count };
    });
    if (counts) { result.expired += counts.expired; result.locked += counts.locked; result.notified += counts.notified; }
  }
  return result;
}
