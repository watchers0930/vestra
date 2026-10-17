"use client";

/**
 * 사업자 4단계 위저드 공유 컨텍스트(설계 §4.2/§5.2, 교차검수 #11).
 *
 * 셸과 단계 화면이 각자 `useMemberSubscription()`을 호출하면 한 화면 진입에서 GET /status가 중복 조회되고
 * (서버는 권한/구독·감시 count·주문·체험 이력 DB 조회를 수행), 자식의 refresh/beginTrial이 셸 가드 데이터와
 * 어긋난다. 이 컨텍스트는 위저드 상위에서 **한 번만** 현황을 조회해 셸 가드와 단계 화면이 같은 시점을 보게 한다.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  useMemberSubscription,
  type UseMemberSubscription,
} from "@/app/(personal-home)/renewal/pricing/hooks/useMemberSubscription";
import {
  useBusinessWizard,
  type UseBusinessWizard,
} from "@/app/(personal-home)/renewal/pricing/hooks/useBusinessWizard";

interface BusinessWizardContextValue {
  sub: UseMemberSubscription;
  wiz: UseBusinessWizard;
  verifyStatus: string | null;
  /** 세션 확정 여부. false면 가드·결제 실행을 보류한다(로딩 중 미로그인 오판 방지, #1). */
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
  const { data: session, status: sessionStatus } = useSession();
  const verifyStatus = session?.user?.verifyStatus ?? null;
  const sub = useMemberSubscription();
  const wiz = useBusinessWizard({ verifyStatus, memberStatus: sub.status });
  // 세션 로딩 중에는 미로그인으로 오판하지 않도록 가드를 보류한다. 인증 완료 시 verifyStatus만으로 maxStep이
  // 확정되므로(완료 판정만 status 의존) 가드는 세션 확정만으로 진행 가능하다.
  const ready = sessionStatus !== "loading";

  return (
    <BusinessWizardContext.Provider value={{ sub, wiz, verifyStatus, ready }}>
      {children}
    </BusinessWizardContext.Provider>
  );
}
