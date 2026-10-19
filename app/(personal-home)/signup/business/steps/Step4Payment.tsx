"use client";

/**
 * 가입 위저드 4단계 — 결제(설계 pro.design §7.1/§7.3). 3단계에서 전달된 URL 힌트(plan/months/kind)로 상품을
 * 재구성해 주문 요약·결제를 보여준다. 결제 완료 근거는 서버 주문 상태(paid && applied)가 유일하며(§5.3),
 * **가입 완료 처리 전 서버 온보딩 상태를 다시 확인**한다(결제 완료 ≠ 온보딩 완료, §4.1·§7.1).
 *
 * 결제 훅·API는 재사용하며 변경하지 않는다. URL은 화면 복구 힌트일 뿐이고, 금액·역할·기간 적격성은 서버가
 * 주문 시 최종 판정한다.
 */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { DurationMonths, MemberPlan, ProductKind } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { OrderSummaryCard } from "@/components/member-subscription/OrderSummaryCard";
import { PaymentStateNotice } from "@/components/member-subscription/PaymentStateNotice";
import { useMemberPricing } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberPricing";
import { useMemberOrderFlow } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow";
import { useBusinessWizardContext } from "../BusinessWizardContext";
import { stepPath } from "../wizardConfig";
import { clearPlanIntent } from "@/app/(personal-home)/signup/planIntent";

const VALID_MONTHS = [1, 3, 6, 9, 12, 24];
const LOGIN_PATH = "/home?auth=login";

export function Step4Payment() {
  const router = useRouter();
  const params = useSearchParams();
  const { update: updateSession } = useSession();
  const { sub, onboarding, wiz } = useBusinessWizardContext();
  const { status, refresh } = sub;
  // 결제 화면의 역할 권위는 서버 온보딩이다. 회원 현황(/status)이 지연·실패해도 역할을 PERSONAL로
  // 대체하지 않는다(이전 버그: status 없음 → PERSONAL 폴백 → 사업자 PREMIUM이 "개인 구매 불가"로 비활성, §7.2).
  const role = onboarding.state?.role;
  const pricing = useMemberPricing(role, { paidTrialEligible: status?.paidTrialEligible });
  // 결제 적용 직후 현황과 온보딩 상태를 함께 재조회한다(완료 판정은 서버 온보딩이 권위).
  // 온보딩은 background 갱신 — 공유 로딩을 켜지 않아 이 결제 컴포넌트가 언마운트돼 완료 상태를 잃지 않는다(§7.1).
  const flow = useMemberOrderFlow({
    onApplied: () => {
      void refresh();
      void onboarding.refresh({ background: true });
      // 결제 완료 → JWT의 needsPaidOnboarding 플래그를 서버에서 즉시 재계산·갱신한다.
      // 인자 없는 update()는 GET이라 jwt callback의 trigger==="update"를 발동하지 못한다 →
      // 반드시 데이터를 전달하는 POST 형태 update({})로 호출해야 재조회가 강제된다(High-B).
      // (미들웨어 온보딩 가드가 stale true로 결제단계로 되돌려 보내는 리다이렉트 루프 방지)
      void updateSession({});
    },
    onReauth: () => router.push(LOGIN_PATH),
  });

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

  // 이미 가입이 끝난 계정(활성 유료·기존 계정)이 결제 단계로 재진입하면 결제가 아닌 앱 홈으로 보낸다
  // (§7.3 complete→/home). 단, 방금 결제를 마친 완료 화면(phase==="done")은 그대로 두고, FREE 신규 가입의
  // 선택적 업셀 결제(wiz.exitToHome=false)도 막지 않는다. 결제 진행 중/복구 중(idle 아님)에도 끼어들지 않는다.
  useEffect(() => {
    if (flow.phase === "idle" && wiz.exitToHome) router.replace("/home");
  }, [flow.phase, wiz.exitToHome, router]);

  // 힌트가 유효하지 않으면 플랜 선택으로 되돌린다(건너뛰기·조작 방어). 완료 화면/완료 계정 이동 중에는 보류.
  useEffect(() => {
    if (flow.phase === "done" || (flow.phase === "idle" && wiz.exitToHome)) return;
    if (!product) router.replace(stepPath(3));
  }, [product, router, flow.phase, wiz.exitToHome]);

  // 결제가 적용되면 복구 힌트를 정리한다(정상 소비, §6).
  useEffect(() => {
    if (flow.phase === "done") clearPlanIntent();
  }, [flow.phase]);

  const canRetry =
    flow.failure === "retry_payment" || flow.failure === "recheck" || flow.failure === "retry_same";

  if (flow.phase === "done") {
    // 서버 온보딩이 아직 complete가 아니면(needs_review·반영 지연 등) 성공으로 단정하지 않고 확인 중으로 안내한다.
    const confirmed = onboarding.state?.complete === true;
    return (
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7 text-center">
        <h1 className="text-xl font-bold text-[#1d1d1f]">
          {confirmed ? "가입이 완료되었습니다" : "결제가 확인되었습니다"}
        </h1>
        <p className="mt-2 text-sm text-[#6e6e73]">
          {confirmed
            ? "결제가 확인되어 플랜이 적용되었습니다."
            : "결제가 적용되었습니다. 가입 완료 처리를 확인하고 있습니다. 잠시 후 현황에서 확인해 주세요."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/profile?tab=tier">
            <Button variant="primary">구독 현황 보기</Button>
          </Link>
          <Link href="/home">
            <Button variant="secondary">홈으로</Button>
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
