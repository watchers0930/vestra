"use client";

/**
 * 가입 위저드 공유 컨텍스트(설계 signup-subscription §4.2/§5.2, pro.design §7).
 *
 * 셸과 단계 화면이 각자 조회하면 한 화면 진입에서 GET /status·GET /onboarding-status가 중복된다.
 * 이 컨텍스트는 위저드 상위에서 현황(GET /status)과 온보딩 상태(GET /onboarding-status)를 **각각 한 번만**
 * 조회해, 셸 가드와 단계 화면이 같은 시점을 보게 한다(중복 호출 방지, §9 성능).
 *
 * 온보딩 상태가 role 일반화·완료 판정의 **서버 권위 입력**이다. 세션은 로딩 전이 판정에만 쓴다.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  useMemberSubscription,
  type UseMemberSubscription,
} from "@/app/(personal-home)/renewal/pricing/hooks/useMemberSubscription";
import {
  useBusinessWizard,
  type UseBusinessWizard,
} from "@/app/(personal-home)/renewal/pricing/hooks/useBusinessWizard";
import {
  useOnboardingStatus,
  type UseOnboardingStatus,
} from "@/app/(personal-home)/signup/hooks/useOnboardingStatus";

interface BusinessWizardContextValue {
  sub: UseMemberSubscription;
  wiz: UseBusinessWizard;
  onboarding: UseOnboardingStatus;
  /** 세션·온보딩이 확정돼 가드·결제 실행이 가능한 상태인지(로딩 중 미로그인·미확정 오판 방지). */
  ready: boolean;
}

const BusinessWizardContext = createContext<BusinessWizardContextValue | null>(null);

export function useBusinessWizardContext(): BusinessWizardContextValue {
  const ctx = useContext(BusinessWizardContext);
  if (!ctx) {
    throw new Error("useBusinessWizardContext must be used within <BusinessWizardProvider>");
  }
  return ctx;
}

export function BusinessWizardProvider({ children }: { children: ReactNode }) {
  const sub = useMemberSubscription();
  const onboarding = useOnboardingStatus();
  const wiz = useBusinessWizard({ onboarding: onboarding.state, memberStatus: sub.status });
  // 세션 로딩/온보딩 조회 중에는 가드를 보류한다. 온보딩이 서버에서 확정(resolved)돼야 단계가 확정된다.
  const ready = !onboarding.loading && wiz.resolved;

  return (
    <BusinessWizardContext.Provider value={{ sub, wiz, onboarding, ready }}>
      {children}
    </BusinessWizardContext.Provider>
  );
}
