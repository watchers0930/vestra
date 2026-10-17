"use client";

/**
 * 회원 구독 가격·구매 화면(설계 §4.3). **조합·진입만** 담당한다(절대규칙 §단일책임).
 * 가격표 파생은 useMemberPricing(SSOT), 현황/체험은 useMemberSubscription, 결제는 useMemberOrderFlow가
 * 담당하며 이 파일은 컴포넌트 배치와 선택 상태만 가진다. 금액·할인·역할·한도는 서버가 결정한다(§4.1).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import type { MemberPlan, MemberProductView } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import RenewalGnb from "../_shared/RenewalGnb";
import s from "../monitoring/monitoring-renewal.module.css";
import { MemberPricingGrid } from "@/components/member-subscription/MemberPricingGrid";
import { PlanDurationPicker } from "@/components/member-subscription/PlanDurationPicker";
import { OrderSummaryCard } from "@/components/member-subscription/OrderSummaryCard";
import { PaymentStateNotice } from "@/components/member-subscription/PaymentStateNotice";
import { SubscriptionStatusCard } from "@/components/member-subscription/SubscriptionStatusCard";
import { RenewalCtaCard } from "@/components/member-subscription/RenewalCtaCard";
import { TrialNotice } from "@/components/member-subscription/TrialNotice";
import { useMemberPricing } from "./hooks/useMemberPricing";
import { useMemberSubscription } from "./hooks/useMemberSubscription";
import { useMemberOrderFlow } from "./hooks/useMemberOrderFlow";

const LOGIN_PATH = "/home?auth=login";

export default function MemberSubscribeClient() {
  const router = useRouter();
  const { status, loading, error, unauthenticated, reauthRequired, refresh, beginTrial, trialBusy } =
    useMemberSubscription();
  // 1개월 유료 체험 적격성까지 반영한 가격표(기사용 계정은 미리 비활성, #8).
  const pricing = useMemberPricing(status?.role, { paidTrialEligible: status?.paidTrialEligible });
  const goLogin = () => router.push(LOGIN_PATH);
  const flow = useMemberOrderFlow({ onApplied: refresh, onReauth: goLogin });

  const [selectedPlan, setSelectedPlan] = useState<MemberPlan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MemberProductView | null>(null);
  const [purpose, setPurpose] = useState<"initial" | "renewal">("initial");
  const [trialError, setTrialError] = useState<string | null>(null);

  // 서버 401/세션 만료(reauthRequired) 또는 미로그인이면 결제 전 로그인 유도(#7).
  const needsLogin = unauthenticated || reauthRequired;

  // 7일 무료체험 적격 플랜(개인=PRO, 사업자=PREMIUM). 서버가 최종 적격성·1회 소비를 판정한다(§3.5).
  const trialPlan: MemberPlan | null = useMemo(() => {
    if (!status?.trialEligible) return null;
    return status.role === "PERSONAL" ? "PRO" : "PREMIUM";
  }, [status]);

  const selectPlan = (plan: MemberPlan) => {
    setSelectedPlan(plan);
    setSelectedProduct(null);
    setPurpose("initial");
  };

  const handleRenew = () => {
    const c = status?.renewalCandidate;
    if (!c) return;
    const product = pricing.byPlan[c.plan].find(
      (p) => p.durationMonths === c.durationMonths && p.productKind === "standard"
    );
    setSelectedPlan(c.plan);
    setSelectedProduct(product ?? null);
    setPurpose("renewal");
  };

  const handlePay = () => {
    if (needsLogin) {
      goLogin();
      return;
    }
    if (!selectedProduct) return;
    void flow.purchase(selectedProduct, { purpose });
  };

  // 체험 성공은 현황 재조회로 반영, 실패는 사유를 화면에 드러낸다(#9).
  const handleTrial = async (plan: MemberPlan) => {
    setTrialError(null);
    const res = await beginTrial(plan);
    if (res.ok) return;
    if (res.status === 401) {
      goLogin();
      return;
    }
    if (res.status === 409) {
      await refresh();
      setTrialError(res.message ?? "구독 현황이 변경되었습니다. 다시 확인해 주세요.");
      return;
    }
    setTrialError(res.message ?? "무료체험을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  };

  const canRetry =
    flow.failure === "retry_payment" || flow.failure === "recheck" || flow.failure === "retry_same";
  const planProducts = selectedPlan ? pricing.byPlan[selectedPlan] : [];

  return (
    <>
      <RenewalGnb />

      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Pricing</span>
          <h1>요금제</h1>
          <p className={s.subHeroSub}>
            필요에 맞는 플랜과 이용 기간을 선택하세요. 자동 청구 없는 선불 결제입니다.
          </p>
        </div>
      </section>

      <div className={s.pageWrap}>
        <div className="mx-auto max-w-[980px] space-y-8">
          {/* 로그인 회원 영역: 재인증/로딩/오류/현황을 명시적으로 분기한다(#7). */}
          {!unauthenticated &&
            (reauthRequired ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#ffe2b8] bg-[#fff8ee] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-[#b26a00]">
                  <LogIn size={18} className="mt-0.5 shrink-0" />
                  <span>로그인이 만료되었습니다. 다시 로그인하면 구독 현황을 이어서 확인할 수 있습니다.</span>
                </div>
                <Button variant="primary" size="sm" onClick={goLogin}>
                  다시 로그인
                </Button>
              </div>
            ) : loading && !status ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[#e5e5e7] bg-white p-6 text-sm text-[#8e8e93]">
                <Loader2 size={16} className="animate-spin text-primary" />
                구독 현황을 불러오는 중…
              </div>
            ) : error ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#f3d2cf] bg-[#fff4f3] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-[#c0392b]">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>구독 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                  다시 시도
                </Button>
              </div>
            ) : status ? (
              // 활성/체험뿐 아니라 만료·grace·잠금 사용자도 현황과 재구독 후보를 볼 수 있다(#12).
              <div className="grid gap-4 md:grid-cols-2">
                <SubscriptionStatusCard status={status} />
                {(status.renewalCandidate || trialPlan) && (
                  <div className="space-y-4">
                    <RenewalCtaCard
                      candidate={status.renewalCandidate}
                      onRenew={handleRenew}
                      busy={flow.busy}
                    />
                    <TrialNotice
                      trialPlan={trialPlan}
                      busy={trialBusy}
                      onStartTrial={(plan) => void handleTrial(plan)}
                      errorMessage={trialError}
                    />
                  </div>
                )}
              </div>
            ) : null)}

          {/* 상품 미선택 모바일 복귀 등 — 결제 진행/결과를 선택 조건 밖에서도 보여준다(#5). */}
          {!selectedPlan && flow.phase !== "idle" && (
            <PaymentStateNotice
              busy={flow.busy}
              done={flow.phase === "done"}
              errorMessage={flow.phase === "failed" ? flow.message : null}
              canRetry={canRetry}
              onRetry={() => void flow.retry()}
              onReset={flow.reset}
            />
          )}

          {/* 플랜 개요 */}
          <MemberPricingGrid
            monthlyBase={pricing.monthlyBase}
            monitoringLimit={pricing.monitoringLimit}
            allowedPlans={pricing.allowedPlans}
            selectedPlan={selectedPlan}
            onSelectPlan={selectPlan}
            personalFreeAvailable={!status || status.role === "PERSONAL"}
          />

          {/* 기간 선택 + 주문 요약 */}
          {selectedPlan && (
            <div className="grid gap-6 md:grid-cols-[1fr_360px]">
              <div>
                <h2 className="mb-3 text-base font-bold text-[#1d1d1f]">이용 기간 선택</h2>
                <PlanDurationPicker
                  products={planProducts}
                  selected={selectedProduct}
                  onSelect={setSelectedProduct}
                  disabled={flow.busy}
                />
              </div>
              <div className="space-y-4">
                <OrderSummaryCard
                  product={selectedProduct}
                  onPay={handlePay}
                  busy={flow.busy}
                  payLabel={needsLogin ? "로그인하고 결제" : purpose === "renewal" ? "재구독 결제" : "결제하기"}
                />
                <PaymentStateNotice
                  busy={flow.busy}
                  done={flow.phase === "done"}
                  errorMessage={flow.phase === "failed" ? flow.message : null}
                  canRetry={canRetry}
                  onRetry={() => void flow.retry()}
                  onReset={flow.reset}
                />
              </div>
            </div>
          )}

          <p className="text-center text-[12px] text-[#8e8e93]">
            모든 가격은 부가세(VAT) 포함 금액입니다. 결제 수단을 저장하지 않으며 자동 결제가 없습니다.
          </p>
        </div>
      </div>
    </>
  );
}
