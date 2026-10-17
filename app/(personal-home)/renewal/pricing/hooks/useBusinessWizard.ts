"use client";

/**
 * 사업자 4단계 위저드 상태 복원 훅(설계 §4.2 / §5.2 `useBusinessWizard`).
 *
 * step 복원의 근거는 **서버 상태**(세션 role·verifyStatus + GET /status)다. URL·sessionStorage의
 * intendedRole/step은 화면 복구 힌트일 뿐 권한 근거가 아니며, 실제 단계 진입 가능 여부(serverStep)는
 * 서버 상태로만 계산한다(§4.2 — 단계 건너뛰기 방어). 새로고침/OAuth 복귀/재로그인에도 재개한다.
 *
 * 단계:
 *  1. 가입        로그인·회원 생성 완료
 *  2. 사업자정보/인증  verifyStatus=verified (대기는 여기서 이어하기)
 *  3. 플랜선택    PRO/PREMIUM·기간 선택
 *  4. 결제        주문 요약·결제·서버 검증(appliedAt) 또는 적격 7일 trialing
 *
 * 실제 인증/신청 저장은 기존 서버 경로가 담당하며, 이 훅은 표시 step 계산·이동만 책임진다(단일 책임).
 */

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { MemberSubscriptionStatus } from "@/types/member-subscription";

export type WizardStep = 1 | 2 | 3 | 4;

export const WIZARD_STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: "가입" },
  { step: 2, label: "사업자 인증" },
  { step: 3, label: "플랜 선택" },
  { step: 4, label: "결제" },
];

export interface UseBusinessWizardOptions {
  /** 기존 인증 상태(세션/프로필에서 전달). "verified" 이전엔 2단계에 머문다. */
  verifyStatus?: string | null;
  /** GET /status 결과(구독/체험 보유 여부로 완료 판정). */
  memberStatus?: MemberSubscriptionStatus | null;
}

export interface UseBusinessWizard {
  /**
   * 서버 상태 기준 진입 가능한 **최대** 단계(가드·진행바 기준). 인증 완료 시 결제(4)까지 진입 가능하며,
   * 결제 완료 전이라도 4로 돌려보내지 않는다(최초 선불 결제 차단 방지, §4.8·§5.2).
   */
  maxStep: WizardStep;
  /** 사용자가 지금 해야 하는 단계(기본 진입·진행바 현재 힌트). 결제 전 인증 완료면 3(플랜 선택). */
  actionStep: WizardStep;
  /** 모든 단계 완료(구독 active/trialing 확보) */
  completed: boolean;
  /** 기존 계정 전환: 1단계는 완료로 표시하고 2단계부터 시작 */
  isExistingAccount: boolean;
}

function deriveWizard(
  authenticated: boolean,
  verifyStatus: string | null | undefined,
  memberStatus: MemberSubscriptionStatus | null | undefined
): { maxStep: WizardStep; actionStep: WizardStep; completed: boolean } {
  if (!authenticated) return { maxStep: 1, actionStep: 1, completed: false };
  // 로그인 완료 → 1단계는 끝. 인증 미완료면 2단계에 머문다(진입 최대도 2).
  if (verifyStatus !== "verified") return { maxStep: 2, actionStep: 2, completed: false };
  // 인증 완료 → 플랜 선택(3)·결제(4)까지 진입 가능. 구독/체험을 이미 확보했으면 완료.
  const active =
    memberStatus != null &&
    memberStatus.plan !== "FREE" &&
    (memberStatus.status === "active" || memberStatus.status === "trialing");
  if (active) return { maxStep: 4, actionStep: 4, completed: true };
  // 인증은 됐으나 결제 전 → 결제 단계(4)까지 진입 가능하되, 현재 행동 단계는 플랜 선택(3).
  return { maxStep: 4, actionStep: 3, completed: false };
}

export function useBusinessWizard(options: UseBusinessWizardOptions = {}): UseBusinessWizard {
  const { status: sessionStatus } = useSession();
  const { verifyStatus, memberStatus } = options;
  const authenticated = sessionStatus === "authenticated";

  const { maxStep, actionStep, completed } = useMemo(
    () => deriveWizard(authenticated, verifyStatus, memberStatus),
    [authenticated, verifyStatus, memberStatus]
  );

  return {
    maxStep,
    actionStep,
    completed,
    isExistingAccount: authenticated,
  };
}
