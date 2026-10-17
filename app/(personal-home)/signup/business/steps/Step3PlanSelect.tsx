"use client";

/**
 * 사업자 위저드 3단계 — 플랜 선택(설계 §4.2). PRO/PREMIUM·기간을 선택한다. 금액·할인은 서버 SSOT 표시만(§4.1).
 * 선택은 다음 단계(결제)로 URL 힌트로 전달하며, 서버가 주문 시 역할·기간·금액을 최종 판정한다.
 * 최초 7일 무료체험 선택 시 결제를 유예하고 trialing으로 완료할 수 있다(§4.8).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberPlan, MemberProductView } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { PlanDurationPicker } from "@/components/member-subscription/PlanDurationPicker";
import { TrialNotice } from "@/components/member-subscription/TrialNotice";
import { useMemberPricing } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberPricing";
import { useBusinessWizardContext } from "../BusinessWizardContext";
import { stepPath } from "../wizardConfig";

const LOGIN_PATH = "/home?auth=login";

export function Step3PlanSelect() {
  const router = useRouter();
  // 셸과 동일한 단일 현황을 공유한다(중복 GET /status 방지, #11).
  const { sub } = useBusinessWizardContext();
  const { status, beginTrial, trialBusy, refresh } = sub;
  const pricing = useMemberPricing(status?.role, { paidTrialEligible: status?.paidTrialEligible });
  const bizPlans = pricing.allowedPlans.filter((p): p is MemberPlan => p === "PRO" || p === "PREMIUM");

  const [plan, setPlan] = useState<MemberPlan>("PREMIUM");
  const [product, setProduct] = useState<MemberProductView | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);

  const trialPlan: MemberPlan | null = useMemo(
    () => (status?.trialEligible ? "PREMIUM" : null),
    [status]
  );

  const effectivePlan = bizPlans.includes(plan) ? plan : bizPlans[0] ?? "PRO";
  const products = pricing.byPlan[effectivePlan].filter((p) => p.productKind === "standard");

  const goPay = () => {
    if (!product) return;
    const q = new URLSearchParams({
      plan: product.plan,
      months: String(product.durationMonths),
      kind: product.productKind,
    });
    router.push(`${stepPath(4)}?${q.toString()}`);
  };

  // 체험 성공은 이동, 실패는 사유를 화면에 드러낸다(401 재로그인·409 현황 갱신·일시 장애, #9).
  const startTrial = async () => {
    if (!trialPlan) return;
    setTrialError(null);
    const res = await beginTrial(trialPlan);
    if (res.ok) {
      router.push("/profile?tab=tier");
      return;
    }
    if (res.status === 401) {
      router.push(LOGIN_PATH);
      return;
    }
    if (res.status === 409) {
      await refresh();
      setTrialError(res.message ?? "구독 현황이 변경되었습니다. 다시 확인해 주세요.");
      return;
    }
    setTrialError(res.message ?? "무료체험을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
        <h1 className="text-xl font-bold text-[#1d1d1f]">플랜 선택</h1>
        <p className="mt-2 text-sm text-[#6e6e73]">사업자 회원은 PRO 또는 PREMIUM을 이용할 수 있습니다.</p>

        <div className="mt-5 flex gap-2">
          {(["PRO", "PREMIUM"] as MemberPlan[]).map((pl) => {
            const allowed = bizPlans.includes(pl);
            const on = effectivePlan === pl;
            return (
              <button
                key={pl}
                type="button"
                disabled={!allowed}
                onClick={() => {
                  setPlan(pl);
                  setProduct(null);
                }}
                className={[
                  "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                  on ? "border-primary bg-primary/5 text-primary" : "border-[#e5e5e7] text-[#48484a]",
                  !allowed ? "opacity-50" : "",
                ].join(" ")}
              >
                {pl === "PRO" ? "프로 (등기감시 5건)" : "프리미엄 (등기감시 20건)"}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-[#1d1d1f]">이용 기간</h2>
          <PlanDurationPicker products={products} selected={product} onSelect={setProduct} />
        </div>

        <div className="mt-6">
          <Button variant="primary" fullWidth disabled={!product} onClick={goPay}>
            다음: 결제
          </Button>
        </div>
      </div>

      {trialPlan && (
        <TrialNotice
          trialPlan={trialPlan}
          busy={trialBusy}
          onStartTrial={() => void startTrial()}
          errorMessage={trialError}
        />
      )}
    </div>
  );
}
