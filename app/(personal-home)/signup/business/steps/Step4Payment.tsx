"use client";

/**
 * 사업자 위저드 4단계 — 결제(설계 §4.2). 3단계에서 전달된 URL 힌트(plan/months/kind)로 상품을 재구성해
 * 주문 요약·결제를 보여준다. 완료 판정은 서버 주문 상태(paid&&applied)가 유일 근거다(§3.2).
 * URL은 화면 복구 힌트일 뿐이며, 금액·역할·기간 적격성은 서버가 주문 시 최종 판정한다.
 */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DurationMonths, MemberPlan, ProductKind } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { OrderSummaryCard } from "@/components/member-subscription/OrderSummaryCard";
import { PaymentStateNotice } from "@/components/member-subscription/PaymentStateNotice";
import { useMemberPricing } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberPricing";
import { useMemberOrderFlow } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow";
import { useBusinessWizardContext } from "../BusinessWizardContext";
import { stepPath } from "../wizardConfig";

const VALID_MONTHS = [1, 3, 6, 9, 12, 24];
const LOGIN_PATH = "/home?auth=login";

export function Step4Payment() {
  const router = useRouter();
  const params = useSearchParams();
  // 셸과 동일한 단일 현황을 공유한다(중복 GET /status 방지, #11).
  const { sub } = useBusinessWizardContext();
  const { status, refresh } = sub;
  const pricing = useMemberPricing(status?.role, { paidTrialEligible: status?.paidTrialEligible });
  const flow = useMemberOrderFlow({ onApplied: refresh, onReauth: () => router.push(LOGIN_PATH) });

  const plan = params.get("plan") as MemberPlan | null;
  const months = Number(params.get("months"));
  const kind = (params.get("kind") as ProductKind | null) ?? "standard";

  const product = useMemo(() => {
    if (plan !== "PRO" && plan !== "PREMIUM") return null;
    if (!VALID_MONTHS.includes(months)) return null;
    return (
      pricing.byPlan[plan].find(
        (p) => p.durationMonths === (months as DurationMonths) && p.productKind === kind
      ) ?? null
    );
  }, [plan, months, kind, pricing]);

  // 힌트가 유효하지 않으면 플랜 선택으로 되돌린다(건너뛰기·조작 방어).
  useEffect(() => {
    if (!product) router.replace(stepPath(3));
  }, [product, router]);

  const canRetry =
    flow.failure === "retry_payment" || flow.failure === "recheck" || flow.failure === "retry_same";

  if (flow.phase === "done") {
    return (
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7 text-center">
        <h1 className="text-xl font-bold text-[#1d1d1f]">구독이 시작되었습니다</h1>
        <p className="mt-2 text-sm text-[#6e6e73]">결제가 확인되어 사업자 플랜이 적용되었습니다.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/profile?tab=tier">
            <Button variant="primary">구독 현황 보기</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">대시보드로</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
      <h1 className="text-xl font-bold text-[#1d1d1f]">결제</h1>
      <p className="mt-2 text-sm text-[#6e6e73]">주문 내용을 확인하고 결제를 진행해 주세요.</p>
      <div className="mt-5 space-y-4">
        <OrderSummaryCard
          product={product}
          busy={flow.busy}
          onPay={() => product && void flow.purchase(product, { purpose: "initial" })}
        />
        <PaymentStateNotice
          busy={flow.busy}
          done={false}
          errorMessage={flow.phase === "failed" ? flow.message : null}
          canRetry={canRetry}
          onRetry={() => void flow.retry()}
          onReset={flow.reset}
        />
      </div>
    </div>
  );
}
