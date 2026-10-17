import type { MemberPlan } from "@/types/member-subscription";
import { memberTransaction } from "./transaction";
import { ensurePolicy, assertPlanAllowed, resolveEffectiveRole } from "./policy";
import { MEMBER_MONITORING_LIMIT } from "./pricing";
import { DAY_MS } from "./lifecycle";
import { fail } from "./errors";
export async function startMemberTrial(userId: string, plan: MemberPlan) {
  return memberTransaction(userId, async tx => {
    const { user, role } = await resolveEffectiveRole(userId, tx);
    assertPlanAllowed(role, plan, user.verifyStatus);
    const policy = await ensurePolicy(user, tx);
    const sub = user.subscription;
    if (policy.trialUsedAt || (sub && (sub.plan !== "FREE" || sub.status === "trialing"))) fail("trial_already_used");
    const pending = await tx.subscriptionOrder.findFirst({ where: { userId, status: { in: ["pending", "paid", "needs_review"] } }, select: { id: true } });
    if (pending) fail("trial_already_used");
    const now = new Date();
    const consumed = await tx.memberSubscriptionPolicy.updateMany({ where: { userId, trialUsedAt: null }, data: { trialUsedAt: now } });
    if (consumed.count !== 1) fail("trial_already_used");
    const trialEndsAt = new Date(now.getTime() + 7 * DAY_MS);
    const data = { plan, price: 0, status: "trialing", trialStartedAt: now, trialEndsAt, endDate: trialEndsAt,
      graceEndsAt: null, lockedAt: null, canceledAt: null, policyVersion: policy.policyVersion };
    await tx.subscription.upsert({ where: { userId }, create: { userId, startDate: now, ...data }, update: data });
    console.info("[MemberSubscription]", { event: "trial_started" });
    return { status: "trialing" as const, plan, trialEndsAt: trialEndsAt.toISOString(), monitoringLimit: MEMBER_MONITORING_LIMIT[plan] };
  });
}
