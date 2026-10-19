import { prisma } from "@/lib/prisma";
import type { MemberRole, OnboardingStage, OnboardingState } from "@/types/member-subscription";
import { memberReleaseConfig } from "./config";
import { fail, MemberError } from "./errors";
import { BUSINESS_ROLES, resolveEffectiveEntitlement } from "./policy";
import { ROLE_ALLOWED_PLANS, ROLE_FREE_ALLOWED } from "./pricing";
import type { MemberTransaction } from "./transaction";

export interface OnboardingFacts {
  role: string;
  requestedRole: string | null;
  verifyStatus: string;
  premiumActive: boolean;
  isNewSignup: boolean;
}

export function requiresPaidToComplete(role: string): boolean {
  return role === "REALESTATE" || role === "BUSINESS";
}

/** No client intent, payment callback, or order status participates in this decision. */
export function decideOnboarding(f: OnboardingFacts): { stage: OnboardingStage; complete: boolean } {
  let stage: OnboardingStage;
  if (f.role !== "ADMIN" && f.role !== "LAWYER" &&
      !Object.prototype.hasOwnProperty.call(ROLE_ALLOWED_PLANS, f.role)) {
    return fail("forbidden");
  } else if (!f.isNewSignup || f.role === "ADMIN" || f.role === "LAWYER") {
    stage = "complete";
  } else if (f.requestedRole && BUSINESS_ROLES.includes(f.requestedRole) && f.verifyStatus !== "verified") {
    stage = "verify";
  } else if (f.role === "PERSONAL" && !f.requestedRole) {
    // The existing schema cannot distinguish default PERSONAL from an explicit
    // PERSONAL selection (setup-role accepts an omitted userType). Do not infer
    // persistent selection from browser hints or invent a new write contract.
    stage = "complete";
  } else if (BUSINESS_ROLES.includes(f.role)) {
    stage = f.verifyStatus !== "verified" ? "verify"
      : requiresPaidToComplete(f.role) && !f.premiumActive ? "pay" : "complete";
  } else {
    stage = "role";
  }
  return { stage, complete: stage === "complete" };
}

async function readOnboardingState(userId: string, now: Date, db: MemberTransaction): Promise<OnboardingState> {
  const e = await resolveEffectiveEntitlement(userId, now, db);
  const user = await db.user.findUnique({ where: { id: userId }, select: { requestedRole: true } });
  if (!user) return fail("unauthorized");
  let release: ReturnType<typeof memberReleaseConfig> | null = null;
  try { release = memberReleaseConfig(); } catch { /* Keep recovery reads available before release. */ }
  // A membershipPolicy row is auto-created by order/trial creation (policy.ts:ensurePolicy)
  // with grandfatheredAt=null, so "policy exists" cannot mean "settled". Only a real
  // grandfather snapshot (grandfatheredAt set) exempts a post-release account from the
  // onboarding gate — otherwise a pending (unpaid) order would falsely complete onboarding.
  const isNewSignup = !!release && !e.policy?.grandfatheredAt && e.user.createdAt >= release.effectiveAt;
  const sub = e.user.subscription;
  // A grandfather snapshot or subscriptionState(null).status === active is not
  // an actual active PREMIUM subscription. Legacy BUSINESS denotes PREMIUM.
  const premiumActive = e.plan === "PREMIUM" && e.state.status === "active" &&
    !!sub && (sub.plan === "PREMIUM" || sub.plan === "BUSINESS") && sub.status === "active";
  const roleAllowed = Object.prototype.hasOwnProperty.call(ROLE_ALLOWED_PLANS, e.role);
  const role = e.role as OnboardingState["role"];
  const decision = decideOnboarding({ role, requestedRole: user.requestedRole,
    verifyStatus: e.user.verifyStatus, premiumActive, isNewSignup });
  return { ...decision, requiresPaid: requiresPaidToComplete(role), role,
    verifyStatus: e.user.verifyStatus, premiumActive, isNewSignup,
    allowedPlans: roleAllowed ? [...ROLE_ALLOWED_PLANS[role as MemberRole]] : [],
    freeAllowed: roleAllowed ? ROLE_FREE_ALLOWED[role as MemberRole] : false };
}

export async function resolveOnboardingState(
  userId: string, now = new Date(), db?: MemberTransaction,
): Promise<OnboardingState> {
  if (db) return readOnboardingState(userId, now, db);
  // Role approval and subscription activation must come from one DB snapshot.
  return prisma.$transaction(tx => readOnboardingState(userId, now, tx), {
    isolationLevel: "RepeatableRead", timeout: 5_000,
  });
}

export class OnboardingIncompleteError extends MemberError {
  constructor(readonly state: OnboardingState) { super("forbidden"); }
}

/** Apply only at protected app entry points; leave signup/payment/recovery open. */
export async function requireOnboardingComplete(userId: string): Promise<OnboardingState> {
  const state = await resolveOnboardingState(userId);
  if (state.isNewSignup && !state.complete && state.requiresPaid) throw new OnboardingIncompleteError(state);
  return state;
}

/**
 * 유료 등기감시 생성/재개 서버 게이트(REALESTATE/BUSINESS). true면 미결제로 차단해야 한다.
 * 모든 감시 생성 경로(agent clients/properties, 개인 monitoring, e-contract 자동감시)에서 공유한다.
 * resolveOnboardingState는 release 미설정(출시 전)이면 complete로 판정 → false 반환(기존 동작 무영향, release-gated).
 */
export async function isMonitoringBlockedByOnboarding(userId: string): Promise<boolean> {
  const state = await resolveOnboardingState(userId);
  return state.requiresPaid && !state.complete;
}
