import type { DurationMonths, MemberPlan, MemberRole, ProductKind } from "@/types/member-subscription";
import { fail, MemberConfigError } from "./errors";
// Release values deliberately remain unset until approved. Never invent launch dates.
export const MEMBER_PRICE_VERSION = process.env.NEXT_PUBLIC_MEMBER_PRICE_VERSION?.trim() ?? "";
export const MEMBER_POLICY_VERSION = process.env.MEMBER_POLICY_VERSION?.trim() ?? "";
export const MEMBER_MONTHLY_BASE: Record<MemberPlan, number> = { PRO: 9900, PREMIUM: 29900 };
export const MEMBER_MONITORING_LIMIT: Record<MemberPlan, number> = { PRO: 5, PREMIUM: 20 };
export const ROLE_ALLOWED_PLANS: Record<MemberRole, MemberPlan[]> = {
  PERSONAL: ["PRO"], RENTAL_BIZ: ["PRO", "PREMIUM"],
  BUSINESS: ["PRO", "PREMIUM"], REALESTATE: ["PRO", "PREMIUM"],
};
export const DURATION_DISCOUNT: Record<DurationMonths, number> = { 1: 0, 3: 0, 6: 10, 9: 15, 12: 20, 24: 30 };
export function computeAmount(monthly: number, months: number, discountPercent: number): number {
  if (![monthly, months, discountPercent].every(Number.isSafeInteger) || monthly <= 0 || months <= 0 ||
      discountPercent < 0 || discountPercent >= 100) throw new MemberConfigError("invalid_price");
  const raw = monthly * months * (100 - discountPercent);
  if (!Number.isSafeInteger(raw) || raw % 100 !== 0) throw new MemberConfigError("non_integer_price");
  return raw / 100;
}
export function priceProduct(plan: MemberPlan, months: DurationMonths, kind: ProductKind) {
  if (kind === "paid_trial" ? plan !== "PRO" || months !== 1 : months === 1) fail("invalid_duration");
  if (!(months in DURATION_DISCOUNT) || !(plan in MEMBER_MONTHLY_BASE)) fail("invalid_duration");
  const monthlyPrice = MEMBER_MONTHLY_BASE[plan];
  const discountPercent = DURATION_DISCOUNT[months];
  return { monthlyPrice, discountPercent, amount: computeAmount(monthlyPrice, months, discountPercent) };
}
