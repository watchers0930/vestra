"use client";

/**
 * 가입 위저드 상태 복원 훅(설계 signup-subscription §4.2 + pro.design §7.1 — role 일반화).
 *
 * step 복원의 근거는 **서버 상태**(`GET /api/signup/onboarding-status`의 stage + 세션 role·verifyStatus)다.
 * URL·sessionStorage의 intendedRole/plan/step은 화면 복구 힌트일 뿐 권한 근거가 아니며, 실제 진입 가능 단계는
 * 서버 상태로만 계산한다(§7.1 — 단계 건너뛰기 방어). 새로고침/OAuth 복귀/재로그인에도 재개한다.
 *
 * 유형별 단계:
 *  - 개인(PERSONAL): 가입 → 플랜 선택 → 결제  (사업자 인증 단계 **생략**)
 *  - 사업자(RENTAL_BIZ/REALESTATE/BUSINESS): 가입 → 사업자 인증 → 플랜 선택 → 결제
 *
 * 완료 조건(클라 라우팅용, 서버 §4 규칙과 동일 결과):
 *  - 개인: 역할 설정 완료 → 서버 complete. 플랜은 선택 사항(미결제여도 앱 접근 가능). 위저드는 플랜 업셀을 노출.
 *  - 임대: verified → 서버 complete(FREE 허용). 유료 선택 시 active면 유료 완료.
 *  - 부동산/기업: verified && 실제 PREMIUM active일 때만 complete. **trialing/grace/FREE/PRO는 완료 아님**
 *    (기존 `plan !== FREE && (active||trialing)` 완료 우회 제거 — §7.1).
 *
 * 실제 인증/신청 저장·주문 적격성은 기존 서버 경로가 담당하며, 이 훅은 표시 step 계산·이동만 책임진다(단일 책임).
 */

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type {
  MemberSubscriptionStatus,
  OnboardingStage,
  OnboardingState,
} from "@/types/member-subscription";

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardStepItem {
  step: WizardStep;
  label: string;
}

const STEP_LABELS: Record<WizardStep, string> = {
  1: "가입",
  2: "사업자 인증",
  3: "플랜 선택",
  4: "결제",
};

const BUSINESS_STEPS: WizardStep[] = [1, 2, 3, 4];
const PERSONAL_STEPS: WizardStep[] = [1, 3, 4]; // 사업자 인증 생략

/** 사업자(인증 단계 노출) 흐름인지 판정. 개인 전용(인증 이력 없음)만 2단계를 생략한다. */
function isBusinessFlow(onboarding: OnboardingState | null): boolean {
  if (!onboarding) return true; // 미확정 중에는 전체 단계 레이아웃을 가정(가드는 ready 전 보류)
  if (onboarding.stage === "verify") return true;
  if (onboarding.verifyStatus && onboarding.verifyStatus !== "none") return true;
  return onboarding.role !== "PERSONAL" && onboarding.role !== "ADMIN" && onboarding.role !== "LAWYER";
}

function stepsFor(onboarding: OnboardingState | null): WizardStepItem[] {
  const steps = isBusinessFlow(onboarding) ? BUSINESS_STEPS : PERSONAL_STEPS;
  return steps.map((step) => ({ step, label: STEP_LABELS[step] }));
}

/** 전체 사업자 단계 정의(호환 유지 — 진행바 기본값). 실제 노출 단계는 wiz.steps를 사용한다. */
export const WIZARD_STEPS: WizardStepItem[] = BUSINESS_STEPS.map((step) => ({
  step,
  label: STEP_LABELS[step],
}));

export interface UseBusinessWizardOptions {
  /** 서버 온보딩 상태(GET /api/signup/onboarding-status). 라우팅·완료 판정의 권위 입력. */
  onboarding?: OnboardingState | null;
  /** GET /status 결과. 활성 유료 구독 보유 여부(완료 표시)로만 사용한다. */
  memberStatus?: MemberSubscriptionStatus | null;
}

export interface UseBusinessWizard {
  /** 서버 상태 기준 진입 가능한 **최대** 단계(가드·진행바 기준). */
  maxStep: WizardStep;
  /** 사용자가 지금 해야 하는 단계(기본 진입·진행바 현재 힌트). */
  actionStep: WizardStep;
  /** 모든 단계 완료(앱 접근 가능 + 더 할 행동 없음) */
  completed: boolean;
  /**
   * 가입 위저드가 아니라 앱 홈(/home)으로 보내야 하는 계정인지(§7.3 complete→/home).
   * 활성 유료 완료·결제 필수 완료, 또는 신규 가입 대상이 아닌 기존 계정(§4.4 isNewSignup=false)이 해당한다.
   * **신규 가입 FREE(개인/임대)는 가입 직후 선택적 플랜 업셀을 노출하기 위해 false로 둔다**(§7.1).
   */
  exitToHome: boolean;
  /** 기존 계정 전환: 1단계는 완료로 표시하고 다음 단계부터 시작 */
  isExistingAccount: boolean;
  /** 유형별 노출 단계(개인은 사업자 인증 생략) */
  steps: WizardStepItem[];
  /** 온보딩 상태가 서버에서 확정됐는지. false면 가드·결제 실행을 보류한다. */
  resolved: boolean;
}

interface Derived {
  maxStep: WizardStep;
  actionStep: WizardStep;
  completed: boolean;
  exitToHome: boolean;
}

function deriveWizard(
  authenticated: boolean,
  onboarding: OnboardingState | null,
  memberStatus: MemberSubscriptionStatus | null | undefined
): Derived {
  if (!authenticated) return { maxStep: 1, actionStep: 1, completed: false, exitToHome: false };
  // 온보딩 미확정: 가드를 1단계로 좁혀두고 호출부가 로딩을 표시하게 한다(구매·완료 보류, §7.2).
  if (!onboarding) return { maxStep: 1, actionStep: 1, completed: false, exitToHome: false };

  const activePaid =
    memberStatus != null && memberStatus.plan !== "FREE" && memberStatus.status === "active";

  const stage: OnboardingStage = onboarding.stage;
  switch (stage) {
    case "role":
      // 역할 미설정 — 위저드 이전 단계. 가입 단계로 되돌린다.
      return { maxStep: 1, actionStep: 1, completed: false, exitToHome: false };
    case "verify":
      return { maxStep: 2, actionStep: 2, completed: false, exitToHome: false };
    case "plan":
      return { maxStep: 4, actionStep: 3, completed: false, exitToHome: false };
    case "pay":
      // 결제 필수(부동산/기업). 기간 선택(3) → 결제(4). 현재 행동은 플랜/기간 선택.
      return { maxStep: 4, actionStep: 3, completed: false, exitToHome: false };
    case "complete":
    default: {
      // 서버 complete: 앱 접근 가능. 부동산/기업(requiresPaid)·활성 유료 보유자는 완료로 본다.
      // 개인/임대 FREE 기본 완료는 플랜 업셀을 계속 노출하기 위해 completed로 잠그지 않는다(§7.1).
      const completed = activePaid || onboarding.requiresPaid;
      // 재진입 라우팅(§7.3): 완료 계정과 "신규 가입 대상이 아닌" 기존 계정(§4.4 isNewSignup=false)은 위저드가
      // 아니라 앱 홈으로 보낸다. 신규 가입 FREE(isNewSignup=true, 비활성유료)만 업셀 플랜 화면에 남긴다.
      const exitToHome = completed || onboarding.isNewSignup === false;
      return { maxStep: 4, actionStep: completed ? 4 : 3, completed, exitToHome };
    }
  }
}

export function useBusinessWizard(options: UseBusinessWizardOptions = {}): UseBusinessWizard {
  const { status: sessionStatus } = useSession();
  const { onboarding, memberStatus } = options;
  // "loading"(결제 후 update({}) 등 세션 재갱신 중)에는 unauthenticated로 떨어뜨리지 않는다.
  // 그렇지 않으면 maxStep이 1로 떨어져 결제 완료(step 4) 화면이 언마운트된다(High-B).
  // 실제 서버 확정(resolved)은 onboarding 유무로 별도 게이트되므로 부수효과 조기실행은 막힌다.
  const authenticated = sessionStatus !== "unauthenticated";

  return useMemo(() => {
    const { maxStep, actionStep, completed, exitToHome } = deriveWizard(
      authenticated,
      onboarding ?? null,
      memberStatus
    );
    return {
      maxStep,
      actionStep,
      completed,
      exitToHome,
      isExistingAccount: authenticated,
      steps: stepsFor(onboarding ?? null),
      resolved: authenticated && !!onboarding,
    };
  }, [authenticated, onboarding, memberStatus]);
}
