"use client";

/**
 * 사업자 4단계 위저드 셸(설계 §4.2/§5.2). 진행바 + 서버 상태 기반 단계 가드만 담당한다(조합·진입).
 * step 복원 근거는 서버 상태(세션 verifyStatus + GET /status)뿐이며, 접근 불가 단계(건너뛰기)는
 * 서버가 허용한 최대 단계로 되돌린다. URL은 화면 복구 힌트일 뿐 권한 근거가 아니다(§4.2).
 *
 * 세션 확정 전에는 리다이렉트·자식 렌더를 보류한다(로딩 중 미로그인 오판으로 1단계로 돌려보내지 않음, #1).
 * 현황 조회는 BusinessWizardProvider가 한 번만 수행하고 셸·단계 화면이 공유한다(#11).
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WizardProgress } from "@/components/member-subscription/WizardProgress";
import { WIZARD_STEPS, type WizardStep } from "@/app/(personal-home)/renewal/pricing/hooks/useBusinessWizard";
import { BusinessWizardProvider, useBusinessWizardContext } from "./BusinessWizardContext";
import { stepPath } from "./wizardConfig";

interface BusinessWizardShellProps {
  step: WizardStep;
  children: ReactNode;
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8e8e93]">
      <Loader2 size={16} className="animate-spin text-primary" />
      불러오는 중…
    </div>
  );
}

function WizardShellInner({ step, children }: BusinessWizardShellProps) {
  const router = useRouter();
  const { wiz, ready } = useBusinessWizardContext();

  // 건너뛰기 방어: 서버가 허용한 최대 단계를 넘어 접근하면 되돌린다. 세션 확정(ready) 전에는 보류(§4.2, #1).
  useEffect(() => {
    if (!ready) return;
    if (step > wiz.maxStep) {
      router.replace(stepPath(wiz.maxStep));
    }
  }, [ready, step, wiz.maxStep, router]);

  const blocked = !ready || step > wiz.maxStep;

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <div className="mb-8">
        <WizardProgress
          steps={WIZARD_STEPS}
          viewStep={step}
          maxStep={wiz.maxStep}
          onStepClick={(s) => router.push(stepPath(s as WizardStep))}
        />
      </div>
      {/* 가드 확정 전/접근 불가 단계는 자식을 렌더하지 않는다(결제 등 부수효과 조기 실행 방지, #1). */}
      {blocked ? <Loading /> : children}
    </div>
  );
}

export function BusinessWizardShell({ step, children }: BusinessWizardShellProps) {
  return (
    <BusinessWizardProvider>
      <WizardShellInner step={step}>{children}</WizardShellInner>
    </BusinessWizardProvider>
  );
}
