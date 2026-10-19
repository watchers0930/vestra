"use client";

/**
 * 가입 위저드 3단계 — 플랜 선택(설계 pro.design §7.2).
 *
 * 노출 유료 카드 = 서버 `onboarding.allowedPlans`(role별 유료 선택지). "무료로 시작" CTA = 서버
 * `onboarding.freeAllowed === true`일 때만. 금액·할인은 서버 SSOT를 표시만 하며(선택 기간의 실제 선불 총액
 * `amount` 함께 표시), 서버가 주문 시 역할·기간·금액을 최종 판정한다(§4.1).
 *
 * - 부동산/기업: PREMIUM 카드 단독 + "가입 완료를 위해 PREMIUM 결제가 필요합니다" 안내. 무료·건너뛰기·
 *   **체험 완료 버튼 없음**. PREMIUM이 자동 선택돼도 기간·총액 확인과 명시적 결제 진행이 필요하다.
 * - 개인/임대: 허용 유료 카드 + "무료로 시작" CTA. 무료는 명시적 선택이며 서버 freeAllowed로 확인한다.
 * - **체험(trialing) 완료 경로는 제거**한다(신규 통합 가입에서 체험으로 완료/건너뛰기 제공 안 함, §7.2).
 * - 역할 미확정·현황 조회 실패 중에는 구매·무료 완료를 실행하지 않는다(셸이 로딩/재시도를 가드, §7.2).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import type { MemberPlan, MemberProductView } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { PlanDurationPicker } from "@/components/member-subscription/PlanDurationPicker";
import { useMemberPricing } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberPricing";
import { useBusinessWizardContext } from "../BusinessWizardContext";
import { stepPath } from "../wizardConfig";
import { clearPlanIntent, markPlanIntent, readIntendedPlan } from "@/app/(personal-home)/signup/planIntent";

const PLAN_LABEL: Record<MemberPlan, string> = {
  PRO: "프로 (등기감시 5건)",
  PREMIUM: "프리미엄 (등기감시 20건)",
};

export function Step3PlanSelect() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const { onboarding, sub } = useBusinessWizardContext();
  const state = onboarding.state;
  const pricing = useMemberPricing(state?.role, { paidTrialEligible: sub.status?.paidTrialEligible });

  const allowedPlans = useMemo<MemberPlan[]>(() => state?.allowedPlans ?? [], [state]);
  const freeAllowed = state?.freeAllowed === true;
  const paidRequired = state?.requiresPaid === true; // 부동산/기업

  const [plan, setPlan] = useState<MemberPlan | null>(null);
  const [product, setProduct] = useState<MemberProductView | null>(null);

  const effectivePlan: MemberPlan | null =
    plan && allowedPlans.includes(plan) ? plan : allowedPlans[0] ?? null;

  const products = useMemo(
    () => (effectivePlan ? pricing.byPlan[effectivePlan].filter((p) => p.productKind === "standard") : []),
    [effectivePlan, pricing]
  );

  // 직전 선택(재인증 왕복 등) 복원 — 소유자(userId) 일치 + 형식 검증 + 현재 서버 allowedPlans 일치 시에만.
  // 소유자/형식 불일치는 readIntendedPlan이 폐기하고, role 불일치는 여기서 무시하고 재선택한다(§6).
  useEffect(() => {
    if (plan || allowedPlans.length === 0 || !userId) return;
    const hint = readIntendedPlan(userId);
    if (hint && allowedPlans.includes(hint.plan)) {
      setPlan(hint.plan);
      const match = pricing.byPlan[hint.plan].find(
        (p) => p.durationMonths === hint.durationMonths && p.productKind === "standard"
      );
      if (match) setProduct(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPlans, userId]);

  // 상태 미확정(방어) — 셸이 선제 가드하지만 안전하게 로딩 표시.
  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8e8e93]">
        <Loader2 size={16} className="animate-spin text-primary" />
        플랜 정보를 불러오는 중…
      </div>
    );
  }

  // 구매 대상이 아닌 역할(ADMIN/LAWYER 등) — 선택지 없음.
  if (allowedPlans.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7 text-center">
        <h1 className="text-xl font-bold text-[#1d1d1f]">선택 가능한 플랜이 없습니다</h1>
        <p className="mt-2 text-sm text-[#6e6e73]">현재 계정은 구독 구매 대상이 아닙니다.</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.push("/home")}>
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  const goPay = () => {
    if (!product) return;
    markPlanIntent(userId, { plan: product.plan, durationMonths: product.durationMonths });
    const q = new URLSearchParams({
      plan: product.plan,
      months: String(product.durationMonths),
      kind: product.productKind,
    });
    router.push(`${stepPath(4)}?${q.toString()}`);
  };

  // 무료로 시작: 서버 freeAllowed 확인(개인/임대) 후 앱으로. FREE는 유료구독·주문을 만들지 않는다(§4.5).
  const startFree = () => {
    if (!freeAllowed) return;
    clearPlanIntent();
    router.push("/home");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
        <h1 className="text-xl font-bold text-[#1d1d1f]">플랜 선택</h1>
        {paidRequired ? (
          <p className="mt-2 rounded-xl bg-[#fff4f3] px-4 py-3 text-sm font-medium text-[#c0392b]">
            가입 완료를 위해 PREMIUM 결제가 필요합니다. 기간을 선택하고 결제를 진행해 주세요.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#6e6e73]">
            필요한 플랜과 이용 기간을 선택하세요. 월 기준가가 아닌 선택 기간의 실제 선불 총액이 결제됩니다.
          </p>
        )}

        {/* 유료 플랜 선택(허용된 카드만). 단일 플랜이면 그대로 선택 표시. */}
        <div className="mt-5 flex gap-2">
          {allowedPlans.map((pl) => {
            const on = effectivePlan === pl;
            return (
              <button
                key={pl}
                type="button"
                onClick={() => {
                  setPlan(pl);
                  setProduct(null);
                }}
                className={[
                  "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                  on ? "border-primary bg-primary/5 text-primary" : "border-[#e5e5e7] text-[#48484a]",
                ].join(" ")}
              >
                {PLAN_LABEL[pl]}
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

      {/* 무료로 시작: 개인·임대만. 명시적 선택 — 유료 실패/이탈을 자동 FREE 전환하지 않는다(§4.2). */}
      {freeAllowed && (
        <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
          <h2 className="text-base font-bold text-[#1d1d1f]">무료로 시작하기</h2>
          <p className="mt-1 text-sm text-[#6e6e73]">
            결제 없이 기본 기능으로 시작할 수 있습니다. 필요할 때 언제든 유료 플랜으로 전환하세요.
          </p>
          <div className="mt-4">
            <Button variant="secondary" fullWidth onClick={startFree}>
              무료로 시작
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
