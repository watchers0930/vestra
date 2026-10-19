"use client";

/**
 * 가입 위저드 셸(설계 signup-subscription §4.2, pro.design §7). 진행바 + 서버 상태 기반 단계 가드만 담당한다.
 * step 복원 근거는 서버 상태(세션 + GET /onboarding-status)뿐이며, 접근 불가·유형에 없는 단계(건너뛰기/개인의
 * 사업자 인증 단계)는 서버가 허용한 단계로 되돌린다. URL은 화면 복구 힌트일 뿐 권한 근거가 아니다(§7.1).
 *
 * 세션·온보딩 확정 전에는 리다이렉트·자식 렌더를 보류한다(로딩 중 미로그인/미확정 오판 방지).
 * 현황·온보딩 조회는 BusinessWizardProvider가 각 한 번만 수행하고 셸·단계 화면이 공유한다(중복 조회 방지).
 */

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { WizardProgress } from "@/components/member-subscription/WizardProgress";
import type { WizardStep } from "@/app/(personal-home)/renewal/pricing/hooks/useBusinessWizard";
import { BusinessWizardProvider, useBusinessWizardContext } from "./BusinessWizardContext";
import { stepPath } from "./wizardConfig";

const LOGIN_PATH = "/home?auth=login";

interface BusinessWizardShellProps {
  step: WizardStep;
  children: ReactNode;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8e8e93]">{children}</div>;
}

function Loading() {
  return (
    <Centered>
      <Loader2 size={18} className="animate-spin text-primary" />
      불러오는 중…
    </Centered>
  );
}

function WizardShellInner({ step, children }: BusinessWizardShellProps) {
  const router = useRouter();
  const { wiz, onboarding, ready } = useBusinessWizardContext();

  // 한 번 확정(ready)되면 이후 세션 재갱신(결제 완료 후 update({}) → sessionStatus "loading")으로 ready가
  // 잠시 false가 돼도 자식을 언마운트하지 않는다. 그렇지 않으면 결제 완료 화면(Step4 done)이 사라졌다가
  // 재마운트되며 flow가 idle로 초기화돼 자동 /home 이동·리다이렉트 루프를 유발한다(High-B).
  const readyOnceRef = useRef(false);
  if (ready) readyOnceRef.current = true;
  const stableReady = ready || readyOnceRef.current;

  // 해당 유형이 노출하는 단계인지(개인은 사업자 인증 단계 없음).
  const visible = useMemo(() => wiz.steps.some((s) => s.step === step), [wiz.steps, step]);

  // 건너뛰기/유형 불일치 방어 + 완료 계정 재진입 라우팅. 확정(ready) 전에는 보류(§7.1·§7.3).
  useEffect(() => {
    if (!ready) return;
    // 완료 계정은 가입 위저드가 아닌 앱 홈으로(§7.3 complete→/home). 결제 단계(4)는 결제 완료 화면 표시를
    // 위해 Step4Payment가 phase를 보고 직접 처리하므로 여기서 가로채지 않는다.
    if (wiz.exitToHome && step !== 4) {
      router.replace("/home");
    } else if (!visible) {
      router.replace(stepPath(wiz.actionStep));
    } else if (step > wiz.maxStep) {
      router.replace(stepPath(wiz.maxStep));
    }
  }, [ready, visible, step, wiz.maxStep, wiz.actionStep, wiz.exitToHome, router]);

  // 온보딩 조회 실패/재인증은 복구 경로를 막지 않도록 현재 화면에서 안내·재시도를 제공한다(§5.1·§7.3).
  if (onboarding.unauthenticated || onboarding.reauthRequired) {
    return (
      <Centered>
        <p>로그인이 필요합니다.</p>
        <Button variant="primary" onClick={() => router.push(LOGIN_PATH)}>
          로그인하기
        </Button>
      </Centered>
    );
  }

  if (!onboarding.loading && onboarding.error) {
    return (
      <Centered>
        <p>{onboarding.error}</p>
        <Button variant="secondary" onClick={() => void onboarding.refresh()}>
          다시 시도
        </Button>
      </Centered>
    );
  }

  // 완료 계정 이동(exitToHome)은 step 4를 제외하고 자식 렌더를 보류한다(step 4는 Step4가 완료화면/이동을 담당).
  // stableReady: 최초 확정 이후 update({}) 중 일시 loading에도 자식 유지(결제 완료 화면 보존).
  const blocked = !stableReady || (wiz.exitToHome && step !== 4) || !visible || step > wiz.maxStep;

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <div className="mb-8">
        <WizardProgress
          steps={wiz.steps}
          viewStep={step}
          maxStep={wiz.maxStep}
          onStepClick={(s) => router.push(stepPath(s as WizardStep))}
        />
      </div>
      {/* 가드 확정 전/접근 불가 단계는 자식을 렌더하지 않는다(결제 등 부수효과 조기 실행 방지). */}
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
