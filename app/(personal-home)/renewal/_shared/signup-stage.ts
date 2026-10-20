/**
 * renewal 가입 상위 5단계 표시 모델(설계 renewal.design §1.4 TR-03).
 *
 * 상위 5단계는 **표시 전용**이며, 기존 `WizardStep=1|2|3|4` 라우트와 서버 `stage` enum을 변경하지 않는다.
 * "접근 가능(reachable)"과 "완료 체크(completed)"를 분리한다 — 완료 체크는 maxStep이 아니라 §2.4의
 * **실제 사실**(유형 선택·OAuth 성공·세부유형 저장/사업자 verified·명시적 플랜 선택·결제 서버 확인)로만 한다.
 *
 * 순수 함수(파생 로직만, React/JSX 없음). 권위 입력은 서버 온보딩 상태(GET /onboarding-status)다.
 */

import type { OnboardingState } from "@/types/member-subscription";

export type SignupStage = 1 | 2 | 3 | 4 | 5;

export interface SignupStageItem {
  stage: SignupStage;
  label: string;
}

/** 상위 5단계(개인·사업자 공통, 3단계 내용만 분기). */
export const SIGNUP_STAGES: SignupStageItem[] = [
  { stage: 1, label: "회원 유형" },
  { stage: 2, label: "소셜 가입" },
  { stage: 3, label: "가입 정보" },
  { stage: 4, label: "플랜 선택" },
  { stage: 5, label: "결제" },
];

export interface SignupStageView {
  /** 실제 사실 기준 완료된 단계(체크 표시). */
  completed: SignupStage[];
  /** 이동 허용 상한(표시/클릭 범위). 완료 체크와 분리. */
  reachable: SignupStage;
}

/** 사업자(인증 단계 노출) 흐름인지 판정. 개인 전용(인증 이력 없음)만 가입정보=세부유형이다. */
function isBusinessFlow(o: OnboardingState): boolean {
  if (o.requiresPaid) return true;
  if (o.verifyStatus && o.verifyStatus !== "none") return true;
  return o.role !== "PERSONAL" && o.role !== "ADMIN" && o.role !== "LAWYER";
}

/**
 * 서버 온보딩 상태에서 5단계 표시 뷰(완료/도달)를 파생한다.
 *
 * ⚠️ 완료 체크는 **서버가 검증한 사실**로만 한다. 서버 `stage`(complete/pay)는 "앱 접근 가능" 판정일 뿐
 * 사용자가 실제로 세부유형·플랜을 선택했다는 사실이 아니다. 특히 `onboarding.ts`는 신규 기본 PERSONAL도
 * 세부유형 선택 여부와 무관하게 `stage="complete"`로 반환하고, 승인된 임대는 무료 선택 전 complete, 부동산/
 * 기업은 승인만으로 pay다. 따라서 stage만으로 3·4단계 완료를 단정하지 않는다(응답 필드·서버 계약은 확장하지
 * 않는다 — TR-03). 현행 응답으로 확정할 수 없는 선택은 체크를 **유보**한다.
 *
 * 확정 가능한 사실:
 *  - 1 회원 유형 / 2 소셜 가입: 가입 위저드에 진입한 로그인 사용자는 둘 다 사실상 완료.
 *  - 3 가입 정보: 사업자=`verifyStatus==="verified"`(검증된 사실). 결제 완료(`premiumActive`)면 그 전 단계가
 *    반드시 끝났으므로 역산해 완료로 본다. 개인 세부유형 저장 여부는 현행 응답으로 확정 불가 → 결제로만 역산.
 *    (사업자 pending/none/rejected는 완료로 보지 않는다 — AC-02·AC-04.)
 *  - 4 플랜 선택: 실제 결제 활성화(`premiumActive`)로만 확정. 무료 선택·미결제 선택은 응답으로 확정 불가 → 유보.
 *  - 5 결제: 실제 PREMIUM 활성화(`premiumActive`)를 서버가 확인한 경우에만(유료 완료 사실).
 */
export function deriveSignupStageView(onboarding: OnboardingState | null): SignupStageView {
  // 미확정(인증됐으나 온보딩 조회 전): 유형·소셜만 완료로 가정하고 가입 정보까지 도달 가능.
  if (!onboarding) return { completed: [1, 2], reachable: 3 };

  const stage = onboarding.stage;
  const verified = onboarding.verifyStatus === "verified";
  const biz = isBusinessFlow(onboarding);
  const paid = onboarding.premiumActive === true;

  const completed: SignupStage[] = [1, 2];

  // 3 가입 정보: 사업자 승인(검증된 사실) 또는 결제 완료(그 전 단계가 끝났다는 역산). 개인 선택은 유보.
  if (paid || (biz && verified)) completed.push(3);
  // 4 플랜 선택: 서버가 확인한 결제 활성화로만 확정. 무료/미결제 선택은 유보.
  if (paid) completed.push(4);
  // 5 결제: 실제 PREMIUM 활성화.
  if (paid) completed.push(5);

  let reachable: SignupStage;
  switch (stage) {
    case "role":
    case "verify":
      reachable = 3;
      break;
    case "plan":
      reachable = 4;
      break;
    case "pay":
    case "complete":
    default:
      reachable = 5;
      break;
  }

  return { completed, reachable };
}

/** 기존 사업자 위저드 단계(1~4) → 상위 표시 단계(2~5) 매핑. step-1(계정)=소셜 가입 완료 지점. */
export function wizardStepToSignupStage(step: 1 | 2 | 3 | 4): SignupStage {
  return (step + 1) as SignupStage;
}
