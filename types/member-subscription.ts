export type MemberPlan = "PRO" | "PREMIUM";
export type DurationMonths = 1 | 3 | 6 | 9 | 12 | 24;
export type ProductKind = "standard" | "paid_trial";
export type MemberRole = "PERSONAL" | "RENTAL_BIZ" | "BUSINESS" | "REALESTATE";
export type OrderStatus = "pending" | "paid" | "needs_review" | "failed" | "canceled" | "refunded";
export type SubStatus = "trialing" | "active" | "grace" | "locked" | "expired" | "canceled";
export interface MemberProductView {
  plan: MemberPlan;
  durationMonths: DurationMonths;
  productKind: ProductKind;
  monthlyPrice: number;
  discountPercent: number;
  amount: number;
  currency: "KRW";
  monitoringLimit: number;
  priceVersion: string;
  eligibleForCurrentRole: boolean;
  disabledReason?: string;
}
export interface MemberSubscriptionStatus {
  plan: MemberPlan | "FREE";
  status: SubStatus;
  role: MemberRole | "ADMIN" | "LAWYER";
  isGrandfathered: boolean;
  startDate: string | null;
  endDate: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  lockedAt: string | null;
  monitoring: { used: number; limit: number };
  trialEligible: boolean;
  paidTrialEligible: boolean;
  renewalCandidate: { plan: MemberPlan; durationMonths: DurationMonths } | null;
  receipts: Array<{ orderId: string; plan: MemberPlan; amount: number; paidAt: string; receiptUrl: string | null }>;
}
export interface MemberOrderRequest {
  purpose: "initial" | "renewal";
  plan: MemberPlan;
  durationMonths: DurationMonths;
  productKind: ProductKind;
  idempotencyKey: string;
}
export interface MemberPaymentCallbackRequest {
  paymentId: string;
  imp_uid: string;
  callbackContext: string;
  callbackSignature: string;
}
export interface MemberPaymentInfo {
  provider: "portone_v2";
  storeId: string;
  channelKey: string;
  payMethod: "CARD";
  paymentId: string;
  orderName: string;
  amount: string;
  currency: "KRW";
  expiresAt: string;
  redirectPath: "/renewal/pricing";
  callbackContext: string;
  callbackSignature: string;
}
export interface MemberOrderResponse {
  orderId: string;
  amount: number;
  currency: "KRW";
  plan: MemberPlan;
  durationMonths: DurationMonths;
  status: OrderStatus;
  payment: MemberPaymentInfo | Record<string, never>;
}
export interface MemberOrderStatus {
  orderId: string;
  status: OrderStatus;
  applied: boolean;
  appliedPeriodStart: string | null;
  appliedPeriodEnd: string | null;
  plan: MemberPlan;
  durationMonths: DurationMonths;
}

/** Server-derived signup state; independent of payment and subscription DTOs. */
export type OnboardingStage = "role" | "verify" | "plan" | "pay" | "complete";
export interface OnboardingState {
  stage: OnboardingStage;
  complete: boolean;
  requiresPaid: boolean;
  role: MemberRole | "ADMIN" | "LAWYER";
  verifyStatus: string;
  premiumActive: boolean;
  isNewSignup: boolean;
  allowedPlans: MemberPlan[];
  freeAllowed: boolean;
}
