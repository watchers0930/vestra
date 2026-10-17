"use client";

/**
 * 회원 가격표 파생 훅(설계 §1.1 `useMemberPricing`, §2.4 SSOT).
 *
 * 서버 SSOT(`lib/member-subscription/pricing.ts` — 클라/서버 공용 순수 데이터)를 **읽기 import**해
 * 역할별 선택 가능 상품(MemberProductView[])을 표시용으로 파생한다. 금액·할인·한도는 전부 SSOT가 결정하며
 * 클라이언트는 표시만 한다(§4.1 — 클라가 금액/할인/한도/역할/기간을 판정하지 않는다).
 *
 * 부적격 상품은 목록에서 빼지 않고 `eligibleForCurrentRole=false` + `disabledReason`으로 표시한다
 * (기획서 §4.3 — "구매 불가 사유와 함께 표시하거나 선택에서 제외"). 서버도 동일 제한을 적용한다(§3.1).
 */

import { useMemo } from "react";
import type {
  DurationMonths,
  MemberPlan,
  MemberProductView,
  MemberRole,
  ProductKind,
} from "@/types/member-subscription";
import {
  MEMBER_MONITORING_LIMIT,
  MEMBER_MONTHLY_BASE,
  MEMBER_PRICE_VERSION,
  ROLE_ALLOWED_PLANS,
  priceProduct,
} from "@/lib/member-subscription/pricing";

/** 서버가 내려준 역할(status.role). MemberRole이 아니면(ADMIN/LAWYER) 구매 대상 아님. */
export type EffectiveRole = MemberRole | "ADMIN" | "LAWYER";

interface ProductSpec {
  plan: MemberPlan;
  durationMonths: DurationMonths;
  productKind: ProductKind;
}

/** 표시 상품 정의(§2.4 표). PRO 1개월은 유료체험(paid_trial)만, PREMIUM 1개월은 제외. */
const PRODUCT_SPECS: ProductSpec[] = [
  { plan: "PRO", durationMonths: 1, productKind: "paid_trial" },
  { plan: "PRO", durationMonths: 3, productKind: "standard" },
  { plan: "PRO", durationMonths: 6, productKind: "standard" },
  { plan: "PRO", durationMonths: 9, productKind: "standard" },
  { plan: "PRO", durationMonths: 12, productKind: "standard" },
  { plan: "PRO", durationMonths: 24, productKind: "standard" },
  { plan: "PREMIUM", durationMonths: 3, productKind: "standard" },
  { plan: "PREMIUM", durationMonths: 6, productKind: "standard" },
  { plan: "PREMIUM", durationMonths: 9, productKind: "standard" },
  { plan: "PREMIUM", durationMonths: 12, productKind: "standard" },
  { plan: "PREMIUM", durationMonths: 24, productKind: "standard" },
];

function isMemberRole(role: EffectiveRole): role is MemberRole {
  return role === "PERSONAL" || role === "RENTAL_BIZ" || role === "BUSINESS" || role === "REALESTATE";
}

/** 역할 기준 상품 적격성 판정(표시용). 서버가 최종 판정하며 여기선 화면 안내만 만든다(§4.5). */
function evaluateEligibility(
  spec: ProductSpec,
  role: EffectiveRole,
  paidTrialEligible: boolean | undefined
): { eligible: boolean; reason?: string } {
  if (!isMemberRole(role)) {
    return { eligible: false, reason: "구독 구매 대상 회원이 아닙니다." };
  }
  const allowedPlans = ROLE_ALLOWED_PLANS[role];
  if (!allowedPlans.includes(spec.plan)) {
    return {
      eligible: false,
      reason:
        spec.plan === "PREMIUM"
          ? "개인 회원은 PREMIUM을 선택할 수 없습니다."
          : "선택할 수 없는 상품입니다.",
    };
  }
  // 1개월 유료 체험(PRO paid_trial)은 개인 전용(§2.4). 사업자는 FREE·1개월 체험 구매 불가.
  if (spec.productKind === "paid_trial") {
    if (role !== "PERSONAL") {
      return { eligible: false, reason: "1개월 체험은 개인 회원 전용입니다." };
    }
    // 서버가 1회 소비를 판정(§2.3 paidTrialEligible). 이미 사용했으면 선택·결제를 미리 차단한다(§4.8).
    // 미확정(undefined)이면 서버가 최종 거부하므로 화면에선 막지 않는다(기본 노출).
    if (paidTrialEligible === false) {
      return { eligible: false, reason: "이미 1개월 유료 체험을 사용했습니다." };
    }
  }
  return { eligible: true };
}

function toProductView(
  spec: ProductSpec,
  role: EffectiveRole,
  paidTrialEligible: boolean | undefined
): MemberProductView {
  const { monthlyPrice, discountPercent, amount } = priceProduct(
    spec.plan,
    spec.durationMonths,
    spec.productKind
  );
  const { eligible, reason } = evaluateEligibility(spec, role, paidTrialEligible);
  return {
    plan: spec.plan,
    durationMonths: spec.durationMonths,
    productKind: spec.productKind,
    monthlyPrice,
    discountPercent,
    amount,
    currency: "KRW",
    monitoringLimit: MEMBER_MONITORING_LIMIT[spec.plan],
    priceVersion: MEMBER_PRICE_VERSION,
    eligibleForCurrentRole: eligible,
    disabledReason: reason,
  };
}

export interface MemberPricingResult {
  /** 전체 표시 상품(부적격 포함, disabledReason 보유) */
  products: MemberProductView[];
  /** 플랜별 상품(기간 선택 UI용) */
  byPlan: Record<MemberPlan, MemberProductView[]>;
  /** 역할이 선택 가능한 플랜 목록(없으면 구매 대상 아님) */
  allowedPlans: MemberPlan[];
  monthlyBase: Record<MemberPlan, number>;
  monitoringLimit: Record<MemberPlan, number>;
}

export interface MemberPricingOptions {
  /** 서버 GET /status의 1개월 유료 체험 적격(§2.3). false면 paid_trial을 사유와 함께 비활성 표시. */
  paidTrialEligible?: boolean;
}

/**
 * 역할(서버 status.role) 기준 회원 가격표를 파생한다. role 미확정이면 보수적으로 PERSONAL로 본다.
 * 서버 적격성(paidTrialEligible)을 함께 받아 기사용 상품을 미리 비활성 표시한다(§4.8).
 */
export function useMemberPricing(
  role: EffectiveRole | null | undefined,
  options: MemberPricingOptions = {}
): MemberPricingResult {
  const { paidTrialEligible } = options;
  return useMemo(() => {
    const effectiveRole: EffectiveRole = role ?? "PERSONAL";
    const products = PRODUCT_SPECS.map((spec) => toProductView(spec, effectiveRole, paidTrialEligible));
    const byPlan: Record<MemberPlan, MemberProductView[]> = { PRO: [], PREMIUM: [] };
    for (const p of products) byPlan[p.plan].push(p);
    const allowedPlans = isMemberRole(effectiveRole) ? ROLE_ALLOWED_PLANS[effectiveRole] : [];
    return {
      products,
      byPlan,
      allowedPlans,
      monthlyBase: MEMBER_MONTHLY_BASE,
      monitoringLimit: MEMBER_MONITORING_LIMIT,
    };
  }, [role, paidTrialEligible]);
}
