"use client";

/**
 * 가입 플랜 의도(복구 힌트) 보존 — 설계 pro.design §6.
 *
 * 기존 `lib/signup-intent.ts`(가입 의도 쿠키 + intendedRole)는 **변경하지 않고**, 선택 플랜·기간 힌트만
 * 이 클라이언트 전용 레이어가 sessionStorage에 별도 보존한다. 재인증 왕복/새로고침에서 직전 선택을
 * 복원하는 **UX 힌트일 뿐 권한 근거가 아니다** — 완료·주문 적격성은 항상 서버가 판정한다(§6·§7.1).
 *
 * 저장 금지: 사업자번호·결제 서명·nonce·callbackContext·imp_uid. 결제 복구용 orderId는 기존
 * useMemberOrderFlow 구현이 전담한다(여기서 다루지 않음). 정상 소비·완료·계정 전환 시 정리한다.
 *
 * 탭 공통 sessionStorage 키라 같은 탭에서 A→로그아웃→B 로그인 시 A의 선택이 B에게 섞일 수 있다. 이를 막기
 * 위해 **비민감 사용자 식별자(userId)로 힌트를 귀속**하고, 조회 시 소유자가 다르면 폐기(삭제)한다(§6).
 * userId는 민감정보가 아니며 가입 의도 쿠키(lib/signup-intent.ts)와 동일 수준의 식별자다.
 */

import type { DurationMonths, MemberPlan } from "@/types/member-subscription";

export const INTENDED_PLAN_KEY = "intendedPlan";

const VALID_PLANS: MemberPlan[] = ["PRO", "PREMIUM"];
const VALID_MONTHS: DurationMonths[] = [1, 3, 6, 9, 12, 24];

export interface IntendedPlan {
  plan: MemberPlan;
  durationMonths: DurationMonths;
}

/** 저장 레코드(소유자 귀속 포함). */
interface StoredIntent extends IntendedPlan {
  owner: string;
}

function isValidPlan(value: unknown): value is IntendedPlan {
  if (!value || typeof value !== "object") return false;
  const v = value as { plan?: unknown; durationMonths?: unknown };
  return (
    typeof v.plan === "string" &&
    VALID_PLANS.includes(v.plan as MemberPlan) &&
    typeof v.durationMonths === "number" &&
    VALID_MONTHS.includes(v.durationMonths as DurationMonths)
  );
}

/**
 * 플랜 선택 힌트 저장(선택 사항). 정상 흐름은 OAuth 이후 선택하므로 비어 있을 수 있다(§6).
 * `owner`(현재 로그인 userId) 없이는 저장하지 않는다 — 소유자 미상 힌트는 계정 간 혼입 위험이 있다.
 */
export function markPlanIntent(owner: string | null | undefined, intendedPlan?: IntendedPlan): void {
  if (typeof sessionStorage === "undefined") return;
  if (!owner || !intendedPlan || !isValidPlan(intendedPlan)) return;
  try {
    const record: StoredIntent = {
      owner,
      plan: intendedPlan.plan,
      durationMonths: intendedPlan.durationMonths,
    };
    sessionStorage.setItem(INTENDED_PLAN_KEY, JSON.stringify(record));
  } catch {
    // 프라이빗 모드 등 sessionStorage 불가 — 힌트 없이 재선택으로 폴백.
  }
}

/**
 * 저장된 플랜 힌트를 **형식 검증 + 소유자 일치 시에만** 반환한다. 소유자가 다르거나(계정 전환·로그아웃 후
 * 타 계정 로그인) 형식이 깨졌으면 즉시 폐기(삭제)해 다른 계정 선택이 섞이지 않게 한다(§6). 현재 서버 role과의
 * 일치 여부는 호출부가 allowedPlans로 한 번 더 확인하고, 불일치면 무시하고 다시 선택하게 한다.
 */
export function readIntendedPlan(owner: string | null | undefined): IntendedPlan | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTENDED_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const rec = parsed as { owner?: unknown };
    // 소유자 불일치/미상 또는 형식 오류 → 폐기.
    if (!owner || typeof rec?.owner !== "string" || rec.owner !== owner || !isValidPlan(parsed)) {
      clearPlanIntent();
      return null;
    }
    return { plan: parsed.plan, durationMonths: parsed.durationMonths };
  } catch {
    clearPlanIntent();
    return null;
  }
}

/** 정상 소비·완료·계정 전환 시 정리(다른 계정 선택 혼입 방지, §6). */
export function clearPlanIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(INTENDED_PLAN_KEY);
  } catch {
    // 무시.
  }
}
