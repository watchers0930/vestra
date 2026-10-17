import type { User, Subscription, MemberSubscriptionPolicy } from "@prisma/client";
import type { MemberPlan, MemberRole } from "@/types/member-subscription";
import { prisma } from "@/lib/prisma";
import { fail } from "./errors";
import { memberReleaseConfig } from "./config";
import { MEMBER_MONITORING_LIMIT, ROLE_ALLOWED_PLANS } from "./pricing";
import { subscriptionState } from "./lifecycle";
import type { MemberTransaction } from "./transaction";
export const BUSINESS_ROLES = ["RENTAL_BIZ", "BUSINESS", "REALESTATE"];
// 역할은 항상 사용자 현재 role(기존 관리자 인증 흐름으로 부여됨)을 쓴다. 결제로 역할을 자동
// 부여/승격하지 않는다(사기위험 차단). 사업자 플랜 접근은 assertPlanAllowed가 verifyStatus로 게이트.
export async function resolveEffectiveRole(userId: string, db: MemberTransaction = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: {
    id: true, role: true, verifyStatus: true, createdAt: true,
    subscription: true, membershipPolicy: true,
  } });
  if (!user) return fail("unauthorized");
  return { user, role: user.role };
}
export function assertPlanAllowed(role: string, plan: MemberPlan, verifyStatus: string) {
  if (!Object.prototype.hasOwnProperty.call(ROLE_ALLOWED_PLANS, role) ||
      !ROLE_ALLOWED_PLANS[role as MemberRole].includes(plan)) fail("plan_not_allowed");
  if (BUSINESS_ROLES.includes(role) && verifyStatus !== "verified") fail("verification_required");
}
type PolicyUser = Awaited<ReturnType<typeof resolveEffectiveRole>>["user"];
export async function ensurePolicy(user: PolicyUser, db: MemberTransaction) {
  const config = memberReleaseConfig();
  if (user.membershipPolicy) return user.membershipPolicy;
  // Existing users require an approved baseline backfill; never guess their rights.
  if (user.createdAt < config.effectiveAt) return fail("provider_unavailable");
  return db.memberSubscriptionPolicy.create({ data: {
    userId: user.id, policyVersion: config.policyVersion, legacyEntitlementsSnapshot: {},
  } });
}
type EntitlementUser = Pick<User, "id" | "role" | "verifyStatus"> & {
  subscription: Subscription | null; membershipPolicy: MemberSubscriptionPolicy | null;
};
export function effectiveEntitlement<T extends EntitlementUser>(user: T, now = new Date()) {
  const role = user.role;
  const policy = user.membershipPolicy;
  const grandfathered = !!policy?.grandfatheredAt || !policy;
  const state = subscriptionState(user.subscription, BUSINESS_ROLES.includes(role), grandfathered, now);
  const sub = user.subscription;
  let plan: MemberPlan | "FREE" = sub?.plan === "BUSINESS" ? "PREMIUM" : sub?.plan === "PRO" || sub?.plan === "PREMIUM" ? sub.plan : "FREE";
  if (sub?.policyVersion && ["expired", "locked", "canceled"].includes(state.status)) plan = "FREE";
  const roleEligible = Object.prototype.hasOwnProperty.call(ROLE_ALLOWED_PLANS, role) &&
    plan !== "FREE" && ROLE_ALLOWED_PLANS[role as MemberRole].includes(plan) &&
    (!BUSINESS_ROLES.includes(role) || user.verifyStatus === "verified");
  const currentActive = sub?.policyVersion ? roleEligible && ["active", "trialing", "grace"].includes(state.status) : (sub?.status ?? "active") === "active";
  let limit = plan !== "FREE" && currentActive ? MEMBER_MONITORING_LIMIT[plan] : 0;
  if (grandfathered) {
    const snapshot = policy?.legacyEntitlementsSnapshot && typeof policy.legacyEntitlementsSnapshot === "object" &&
      !Array.isArray(policy.legacyEntitlementsSnapshot)
      ? policy.legacyEntitlementsSnapshot as Record<string, unknown> : {};
    const hasBaseline = typeof snapshot.monitoringLimit === "number" &&
      Number.isSafeInteger(snapshot.monitoringLimit) && snapshot.monitoringLimit >= 0;
    // A partial backfill may have recorded only the old plan. Restore that
    // baseline without requiring an active Subscription row. An explicit zero
    // remains authoritative; missing/invalid data never grants new-term rights.
    if (!hasBaseline) {
      const legacyLimit = snapshot.plan === "PRO" ? 5 :
        snapshot.plan === "BUSINESS" || snapshot.plan === "PREMIUM" ? 20 : 0;
      limit = Math.max(limit, legacyLimit);
    }
    if (plan === "FREE" && (snapshot.plan === "PRO" || snapshot.plan === "PREMIUM" || snapshot.plan === "BUSINESS")) {
      plan = snapshot.plan === "BUSINESS" ? "PREMIUM" : snapshot.plan;
    }
    if (hasBaseline) {
      limit = Math.max(limit, snapshot.monitoringLimit as number);
    }
  }
  if (role === "ADMIN") limit = 100;
  return { user, role, policy, grandfathered, state, plan, monitoringLimit: limit,
    canUsePaidFeatures: limit > 0 };
}
export async function resolveEffectiveEntitlement(userId: string, now = new Date(), db: MemberTransaction = prisma) {
  const { user } = await resolveEffectiveRole(userId, db);
  return effectiveEntitlement(user, now);
}
/** Call from member API/monitoring workers before performing paid operations. */
export async function requireMemberEntitlement(userId: string) {
  const entitlement = await resolveEffectiveEntitlement(userId);
  if (!entitlement.canUsePaidFeatures) fail("forbidden");
  return entitlement;
}
