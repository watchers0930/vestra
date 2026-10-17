import { memberTransaction } from "./transaction";
import { assertPlanAllowed, resolveEffectiveRole } from "./policy";
import { fail } from "./errors";
import { memberProviderConfig } from "./provider";
import { MEMBER_MONITORING_LIMIT } from "./pricing";
import { paidPeriod } from "./lifecycle";
import type { MemberPlan } from "@/types/member-subscription";
export async function activateMemberOrder(userId: string, orderId: string) {
  return memberTransaction(userId, async tx => {
    const order = await tx.subscriptionOrder.findFirst({ where: { userId, orderId } });
    if (!order) return fail("not_found");
    if (order.status === "needs_review") fail("payment_needs_review");
    if (order.appliedAt) return order;
    if (order.status !== "paid" || !order.paidAt || !order.providerTransactionId || !order.verificationEvidence || !order.nonceConsumedAt) fail("payment_failed");
    const config = memberProviderConfig();
    if (order.channelEnvironment !== config.channelEnvironment || order.merchantConfigVersion !== config.merchantConfigVersion) fail("provider_unavailable");
    const { user, role } = await resolveEffectiveRole(userId, tx);
    assertPlanAllowed(role, order.plan as MemberPlan, user.verifyStatus);
    if (role !== order.roleAtOrder) fail("payment_needs_review");
    const sub = user.subscription;
    if (sub?.status === "active" && (!sub.endDate || sub.endDate > new Date()) && sub.plan !== "FREE" &&
        (sub.plan === "BUSINESS" ? "PREMIUM" : sub.plan) !== order.plan) fail("plan_change_not_allowed");
    const now = new Date();
    const period = paidPeriod(sub, order.durationMonths, now);
    const data = { plan: order.plan, price: order.monthlyPrice, status: "active", endDate: period.end,
      canceledAt: null, trialEndsAt: null, graceEndsAt: null, lockedAt: null, policyVersion: order.policyVersion };
    const subscription = await tx.subscription.upsert({ where: { userId }, update: data,
      create: { userId, ...data, startDate: period.start } });
    // Preserve every property. If the new plan cannot cover them, the user
    // chooses which ones to reactivate through the existing registration API.
    if (!user.membershipPolicy?.grandfatheredAt) {
      const count = await tx.monitoredProperty.count({ where: { userId, status: "active" } });
      if (count > MEMBER_MONITORING_LIMIT[order.plan as MemberPlan]) {
        await tx.monitoredProperty.updateMany({ where: { userId, status: "active" }, data: { status: "paused" } });
      }
    }
    await tx.payment.create({ data: { subscriptionId: subscription.id, subscriptionOrderId: order.id,
      orderId: order.orderId, amount: order.amount, method: "card", status: "completed" } });
    const result = await tx.subscriptionOrder.update({ where: { id: order.id }, data: {
      subscriptionId: subscription.id, appliedPeriodStart: period.start, appliedPeriodEnd: period.end, appliedAt: now,
    } });
    console.info("[MemberSubscription]", { orderId, event: "subscription_applied" });
    return result;
  });
}
